sap.ui.define(
  [
    "sap/ui/core/Control",
    "sap/ui/core/Fragment",
    "sap/m/MultiInput",
    "sap/m/Token",
    "sap/ui/model/type/String",
    "sap/m/SearchField",
    "sap/m/ColumnListItem",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/Column",
    "sap/ui/table/Column",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
  ],
  function (
    Control,
    Fragment,
    MultiInput,
    Token,
    TypeString,
    SearchField,
    ColumnListItem,
    Label,
    Text,
    MColumn,
    UIColumn,
    Filter,
    FilterOperator
  ) {
    "use strict";

    return Control.extend("ui5.controls.ValueHelperWrapper", {
      metadata: {
        properties: {
          modelName: { type: "string", defaultValue: "" },
          entitySet: { type: "string", defaultValue: "" },
          codeBinding: { type: "string", defaultValue: "" },
          codeLabel: { type: "string", defaultValue: "" },
          descBinding: { type: "string", defaultValue: "" },
          descLabel: { type: "string", defaultValue: "" }
        },
        aggregations: {
          _multiInput: {
            type: "sap.m.MultiInput",
            multiple: false,
            visibility: "hidden"
          }
        }
      },

      init: function () {
        this._oMultiInput = new MultiInput({
          width: "600px",
          valueHelpRequest: this.onValueHelpRequested.bind(this),
          showValueHelp: true
        });
        this._oMultiInput.addValidator(this._onMultiInputValidate);
        this.setAggregation("_multiInput", this._oMultiInput);
      },

      onAfterRendering: function () {
        // Loads the view after rendering to allow adding dependants after the controller have fully loaded
        this._oView = this._getView();
      },
      /********************* Begin Value Help Dialog *****************************/
      onValueHelpRequested: function () {
        this._oBasicSearchField = new SearchField();
        Fragment.load({
          name: "ui5.fragments.ValueHelpDialogFilterbar",
          controller: this
        }).then(
          function (oDialog) {
            var oFilterBar = oDialog.getFilterBar(),
              oColumnProductCode,
              oColumnProductName;
            this._oVHD = oDialog;

            this._oView.addDependent(oDialog);

            // Set key fields for filtering in the Define Conditions Tab
            oDialog.setRangeKeyFields([
              {
                label: "Product",
                key: "ProductCode",
                type: "string",
                typeInstance: new TypeString(
                  {},
                  {
                    maxLength: 7
                  }
                )
              }
            ]);

            // Set Basic Search for FilterBar
            oFilterBar.setFilterBarExpanded(false);
            oFilterBar.setBasicSearch(this._oBasicSearchField);

            // Trigger filter bar search when the basic search is fired
            this._oBasicSearchField.attachSearch(function () {
              oFilterBar.search();
            });

            oDialog.getTableAsync().then(
              function (oTable) {
                oTable.setModel(this.oModel);

                // For Desktop and tabled the default table is sap.ui.table.Table
                if (oTable.bindRows) {
                  // Bind rows to the ODataModel and add columns
                  oTable.bindAggregation("rows", {
                    path: this.getEntitySet(),
                    events: {
                      dataReceived: function () {
                        oDialog.update();
                      }
                    }
                  });
                  oColumnProductCode = new UIColumn({
                    label: new Label({
                      text: this.getCodeLabel()
                    }),
                    template: new Text({
                      wrapping: false,
                      text: {
                        path: this.getCodeBinding(),
                        formatter: this.getCodeBinding()
                      }
                    })
                  });
                  oColumnProductCode.data({
                    fieldName: this.getCodeBinding()
                  });
                  oColumnProductName = new UIColumn({
                    label: new Label({
                      text: this.getDescLabel()
                    }),
                    template: new Text({
                      wrapping: false,
                      text: {
                        path: this.getDescBinding(),
                        formatter: this.getDescBinding()
                      }
                    })
                  });
                  oColumnProductName.data({
                    fieldName: this.getDescBinding()
                  });
                  oTable.addColumn(oColumnProductCode);
                  oTable.addColumn(oColumnProductName);
                }

                // For Mobile the default table is sap.m.Table
                if (oTable.bindItems) {
                  // Bind items to the ODataModel and add columns
                  oTable.bindAggregation("items", {
                    path: this.getEntitySet(),
                    template: new ColumnListItem({
                      cells: [
                        new Label({
                          text: {
                            path: this.getCodeBinding(),
                            formatter: this.getCodeBinding()
                          }
                        }),
                        new Label({
                          text: {
                            path: this.getDescBinding(),
                            formatter: this.getDescBinding()
                          }
                        })
                      ]
                    }),
                    events: {
                      dataReceived: function () {
                        oDialog.update();
                      }
                    }
                  });
                  oTable.addColumn(
                    new MColumn({
                      header: new Label({
                        text: this.getCodeLabel()
                      })
                    })
                  );
                  oTable.addColumn(
                    new MColumn({
                      header: new Label({
                        text: this.getDescLabel()
                      })
                    })
                  );
                }
                oDialog.update();
              }.bind(this)
            );

            oDialog.setTokens(this._oMultiInput.getTokens());
            oDialog.open();
          }.bind(this)
        );
      },

      onFilterBarSearch: function (oEvent) {
        var sSearchQuery = this._oBasicSearchField.getValue(),
          aSelectionSet = oEvent.getParameter("selectionSet");

        var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
          if (oControl.getValue()) {
            aResult.push(
              new Filter({
                path: oControl.getName(),
                operator: FilterOperator.Contains,
                value1: oControl.getValue()
              })
            );
          }

          return aResult;
        }, []);

        aFilters.push(
          new Filter({
            filters: [
              new Filter({
                path: this.getCodeBinding(),
                operator: FilterOperator.Contains,
                value1: sSearchQuery
              }),
              new Filter({
                path: this.getDescBinding(),
                operator: FilterOperator.Contains,
                value1: sSearchQuery
              })
            ],
            and: false
          })
        );

        this._filterTable(
          new Filter({
            filters: aFilters,
            and: true
          })
        );
      },

      onValueHelpOkPress: function (oEvent) {
        var aTokens = oEvent.getParameter("tokens");
        this._oMultiInput.setTokens(aTokens);
        this._oVHD.close();
      },

      onValueHelpCancelPress: function () {
        this._oVHD.close();
      },

      onValueHelpAfterClose: function () {
        this._oVHD.destroy();
      },
      /********************* End Value Help Dialog  *****************************/

      /********************* Begin Internal helper methods *****************************/
      _onMultiInputValidate: function (oArgs) {
        var sWhitespace = " ",
          sUnicodeWhitespaceCharacter = "\u00A0"; // Non-breaking whitespace

        if (oArgs.suggestionObject) {
          var oObject = oArgs.suggestionObject.getBindingContext().getObject(),
            oToken = new Token(),
            sOriginalText = oObject.ProductCode.replaceAll(
              sWhitespace + sWhitespace,
              sWhitespace + sUnicodeWhitespaceCharacter
            );

          oToken.setKey(oObject.ProductCode);
          oToken.setText(oObject.ProductName + " (" + sOriginalText + ")");
          return oToken;
        }
        return null;
      },
      _filterTable: function (oFilter) {
        var oVHD = this._oVHD;

        oVHD.getTableAsync().then(function (oTable) {
          if (oTable.bindRows) {
            oTable.getBinding("rows").filter(oFilter);
          }
          if (oTable.bindItems) {
            oTable.getBinding("items").filter(oFilter);
          }

          // This method must be called after binding update of the table.
          oVHD.update();
        });
      },

      _getView: function () {
        var oParent = this.getParent();
        while (oParent) {
          if (oParent instanceof sap.ui.core.mvc.View) {
            return oParent;
          }
          oParent = oParent.getParent();
        }
        return null;
      },

      /********************* End Internal helper methods *****************************/

      renderer: {
        render: function (oRm, oControl) {
          oRm.renderControl(oControl.getAggregation("_multiInput"));
        }
      }
    });
  }
);
