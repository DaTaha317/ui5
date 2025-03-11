/*global QUnit*/

sap.ui.define([
	"ui5/controller/ValueHelper.controller"
], function (Controller) {
	"use strict";

	QUnit.module("ValueHelper Controller");

	QUnit.test("I should test the ValueHelper controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
