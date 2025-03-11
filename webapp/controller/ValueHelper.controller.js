sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/type/String",
    "sap/m/ColumnListItem",
    "sap/m/Label",
    "sap/m/SearchField",
    "sap/m/Token",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/table/Column",
    "sap/m/Column",
    "sap/m/Text"
  ],
  function (
    Controller,
    TypeString,
    ColumnListItem,
    Label,
    SearchField,
    Token,
    Filter,
    FilterOperator,
    UIColumn,
    MColumn,
    Text
  ) {
    "use strict";

    return Controller.extend("ui5.controller.ValueHelper", {
      oDefaultModel: "",
      /********************* Begin Life Cycle Methods *****************************/
      onInit: function () {
        this.oDefaultModel = this.getOwnerComponent().getModel();
        this.getView().setModel(this.oDefaultModel);

        var oMultiInput;
        // Value Help Dialog standard use case with filter bar without filter suggestions
        oMultiInput = this.byId("multiInput");
        oMultiInput.addValidator(this._onMultiInputValidate);
        this._oMultiInput = oMultiInput;
      },
      /********************* End Life Cycle Methods *****************************/

      /********************* Begin Value Help Dialog *****************************/
      onValueHelpRequested: function () {
        this._oBasicSearchField = new SearchField();
        this.loadFragment({
          name: "ui5.fragments.ValueHelpDialogFilterbar"
        }).then(
          function (oDialog) {
            var oFilterBar = oDialog.getFilterBar(),
              oColumnProductCode,
              oColumnProductName;
            this._oVHD = oDialog;

            this.getView().addDependent(oDialog);

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
                    path: "/Suppliers",
                    events: {
                      dataReceived: function () {
                        oDialog.update();
                      }
                    }
                  });
                  oColumnProductCode = new UIColumn({
                    label: new Label({
                      text: "Supplier Id"
                    }),
                    template: new Text({
                      wrapping: false,
                      text: "{SupplierID}"
                    })
                  });
                  oColumnProductCode.data({
                    fieldName: "SupplierID"
                  });
                  oColumnProductName = new UIColumn({
                    label: new Label({
                      text: "Company Name"
                    }),
                    template: new Text({
                      wrapping: false,
                      text: "{CompanyName}"
                    })
                  });
                  oColumnProductName.data({
                    fieldName: "CompanyName"
                  });
                  oTable.addColumn(oColumnProductCode);
                  oTable.addColumn(oColumnProductName);
                }

                // For Mobile the default table is sap.m.Table
                if (oTable.bindItems) {
                  // Bind items to the ODataModel and add columns
                  oTable.bindAggregation("items", {
                    path: "/companies",
                    template: new ColumnListItem({
                      cells: [
                        new Label({
                          text: "{SupplierID}"
                        }),
                        new Label({
                          text: "{CompanyName}"
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
                        text: "Supplier Id"
                      })
                    })
                  );
                  oTable.addColumn(
                    new MColumn({
                      header: new Label({
                        text: "Company Name"
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
                path: "SupplierID",
                operator: FilterOperator.Contains,
                value1: sSearchQuery
              }),
              new Filter({
                path: "CompanyName",
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
      }
      /********************* End Internal helper methods *****************************/
    });
  }
);
