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
          config: { type: "object", defaultValue: {} }
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
        this._oView = this._getView();
        this._oConfig = this.getConfig() || {};
      },
      /********************* Begin Value Help Dialog *****************************/
      onValueHelpRequested: function () {
        this._oBasicSearchField = new SearchField();
        Fragment.load({
          name: "ui5.fragments.ValueHelpDialogFilterbar",
          controller: this
        }).then(
          function (oDialog) {
            var oFilterBar = oDialog.getFilterBar();
            this._oVHD = oDialog;

            this.addDependent(oDialog);

            // Once I better understand the concept of renges, I will refactor it to account for the dynamic nautre of fields
            // Set key fields for filtering in the Define Conditions Tab
            // oDialog.setRangeKeyFields([
            //   {
            //     label: this._oConfig.fields[0].label,
            //     key: this._oConfig.fields[0].code,
            //     type: "string",
            //     typeInstance: new TypeString(
            //       {},
            //       {
            //         maxLength: 7
            //       }
            //     )
            //   }
            // ]);

            // Set key fields for filtering

            if (oFilterBar && this._oConfig.fields) {
              this._oConfig.fields.forEach(function (field) {
                var oFilterGroupItem =
                  new sap.ui.comp.filterbar.FilterGroupItem({
                    groupName: "__$INTERNAL$",
                    name: field.code,
                    label: field.label,
                    visibleInFilterBar: true,
                    control: new sap.m.Input({ name: field.code })
                  });
                oFilterBar.addFilterGroupItem(oFilterGroupItem);
              });
            }

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

                // For Desktop and Tablet (sap.ui.table.Table)
                if (oTable.bindRows) {
                  oTable.bindAggregation("rows", {
                    path: this._oConfig.entitySet,
                    events: {
                      dataReceived: function () {
                        oDialog.update();
                      }
                    }
                  });

                  // Loop through fields and create columns dynamically
                  this._oConfig.fields.forEach((field) => {
                    let oColumn = new UIColumn({
                      label: new Label({
                        text: field.label
                      }),
                      template: new Text({
                        wrapping: false,
                        text: {
                          path: field.code,
                          formatter: field.code
                        }
                      })
                    });

                    oColumn.data({ fieldName: field.code });
                    oTable.addColumn(oColumn);
                  });
                }

                // For Mobile (sap.m.Table)
                if (oTable.bindItems) {
                  oTable.bindAggregation("items", {
                    path: this._oConfig.entitySet,
                    template: new ColumnListItem({
                      cells: this._oConfig.fields.map(
                        (field) =>
                          new Label({
                            text: {
                              path: field.code,
                              formatter: field.code
                            }
                          })
                      )
                    }),
                    events: {
                      dataReceived: function () {
                        oDialog.update();
                      }
                    }
                  });

                  // Loop through fields and create mobile table columns dynamically
                  this._oConfig.fields.forEach((field) => {
                    oTable.addColumn(
                      new MColumn({
                        header: new Label({
                          text: field.label
                        })
                      })
                    );
                  });
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
                path: this._oConfig.fields[0].code,
                operator: FilterOperator.Contains,
                value1: sSearchQuery
              }),
              new Filter({
                path: this._oConfig.fields[1].code,
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

      /********************* End Internal helper methods *****************************/

      renderer: {
        render: function (oRm, oControl) {
          oRm.renderControl(oControl.getAggregation("_multiInput"));
        }
      }
    });
  }
);
