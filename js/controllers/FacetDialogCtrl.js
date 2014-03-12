'use strict';

function FacetDialogCtrl($scope, $modalInstance, fields) {
    $scope.fields = fields;
    $scope.facetTypes = ["Term", "Range", "Histogram", "DateHistogram"];
    $scope.ranges = [];
    $scope.intervals = ["year", "month", "week", "day", "hour", "minute"];

    $scope.close = function (result) {
        var dialogResult = {};
        dialogResult.field = result.field;
        if (result.facettype === 'Term') {
            dialogResult.facetType = 'term';
        } else if (result.facettype === 'Range') {
            dialogResult.facetType = 'range';
            dialogResult.ranges = $scope.ranges;
        } else if (result.facettype === 'DateHistogram') {
            dialogResult.facetType = 'datehistogram';
            dialogResult.interval = result.interval;
        } else if (result.facettype === 'Histogram') {
            dialogResult.facetType = 'histogram';
            dialogResult.interval = result.interval;
        }
        $modalInstance.close(dialogResult);
    };

    $scope.addRangeField = function (data) {
        $scope.ranges.push([data.range.from, data.range.to]);
    }
}