sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("ui5.controller.ValueHelper", {
    oDefaultModel: "",
    onInit: function () {
      this.oDefaultModel = this.getOwnerComponent().getModel();
      this.getView().setModel(this.oDefaultModel);

      var oModel = new sap.ui.model.json.JSONModel({
        SupplierConfig: {
          entitySet: "/Suppliers",
          fields: [
            { code: "SupplierID", label: "Supplier Id" },
            { code: "CompanyName", label: "Company Name" },
            { code: "Country", label: "Country" }
          ]
        },
        EmployeeConfig: {
          entitySet: "/Employees",
          fields: [
            { code: "EmployeeID", label: "Employee Id" },
            { code: "FirstName", label: "First Name" },
            { code: "LastName", label: "Last Name" },
            { code: "BirthDate", label: "Birth Date" }
          ]
        }
      });

      this.getView().setModel(oModel, "viewModel");
    }
  });
});
