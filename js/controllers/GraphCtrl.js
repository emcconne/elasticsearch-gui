'use strict';

function GraphCtrl($scope, $modal, elastic, facetBuilder) {
    $scope.indices = [];
    $scope.types = [];
    $scope.fields = [];
    $scope.results = [];

    /* Functions to retrieve values used to created the query */
    $scope.loadIndices = function () {
        elastic.indexes(function (data) {
            $scope.indices = data;
        });
    };

    $scope.loadTypes = function () {
        elastic.types([],function (data) {
            $scope.types = data;
        });
    };

    $scope.loadFields = function () {
        elastic.fields([], [], function (data) {
            $scope.fields = data;
        });
    };

    $scope.openDialog = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/facet.html',
            controller: 'FacetDialogCtrl',
            resolve: {fields: function () {
                return angular.copy($scope.fields)
            } }};
        var d = $modal.open(opts);
        d.result.then(function (result) {
            if (result) {
                $scope.facet = result;
            }
        });
    };

    function getValue(data) {
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                return data[key];
            }
        }
    }

    $scope.executeQuery = function () {
        var query = createQuery();

        elastic.doSearch(query,function (results) {
            $scope.results = getValue(results.facets);
        },function(errors) {
            console.log(errors);
        });


    };

    function createQuery() {
        var query = {};
        query.index = "";
        query.body = {};
        query.size = 0;
        query.body.query = {"matchAll":{}};
        var facets = [];
        facets.push($scope.facet);
        query.body.facets = facetBuilder.build(facets);

        return query;
    }

    $scope.loadIndices();
    $scope.loadTypes();
    $scope.loadFields();
}
GraphCtrl.$inject = ['$scope', '$modal', 'elastic', 'facetBuilder'];