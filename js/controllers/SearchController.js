'use strict';

function SearchController($scope, elastic, configuration, facetBuilder, $modal, queryStorage) {
    $scope.isCollapsed = true;
    $scope.configure = configuration;
    $scope.fields = [];
    $scope.clusterName = "";
    $scope.search = {};
    $scope.search.advanced = {};
    $scope.search.advanced.searchFields = [];
    $scope.search.facets = [];
    $scope.search.selectedFacets = [];

    $scope.configError = "";

    $scope.results = [];
    $scope.facets = [];

    // initialize pagination
    $scope.currentPage = 1;
    $scope.maxSize = 5;
    $scope.numPages = 0;
    $scope.pageSize = 10;
    $scope.totalItems = 0;

    $scope.changePage = function (pageNo) {
        $scope.currentPage = pageNo;
        $scope.doSearch();
    };


    $scope.init = function () {
        elastic.fields([], [], function (data) {
            $scope.fields = data;
            if (!$scope.configure.title) {
                if ($scope.fields.title) {
                    $scope.configure.title = "title";
                }
            }

            if (!$scope.configure.description && $scope.fields.description) {
                $scope.configure.description = "description";
            }
        });
        elastic.clusterName(function (data) {
            $scope.clusterName = data;
        });
    };

    $scope.restartSearch = function() {
        $scope.currentPage = 1;
        $scope.numPages = 0;
        $scope.pageSize = 10;
        $scope.totalItems = 0;
        $scope.doSearch();        
    };

    $scope.doSearch = function () {
        if ((!($scope.configure.title)) || (!($scope.configure.description))) {
            $scope.configError = "Please configure the title and description in the configuration at the top of the page.";
        } else {
            $scope.configError = "";
        }

        var query = {};
        query.index = "";
        query.body = {};
        query.fields = $scope.configure.title + "," + $scope.configure.description

        query.size = $scope.pageSize;
        query.from = ($scope.currentPage - 1) * $scope.pageSize;
        
        query.body.facets = facetBuilder.build($scope.search.facets);
        var filter = filterChosenFacetPart();
        if (filter) {
            query.body.query = {"filtered":{"query":searchPart(),"filter":filter}};
        } else {
            query.body.query = searchPart();
        }
        
        $scope.metaResults = {};
        elastic.doSearch(query,function (results) {
            $scope.results = results.hits;
            $scope.facets = results.facets;
            $scope.numPages = Math.ceil(results.hits.total / $scope.pageSize);
            $scope.totalItems = results.hits.total;

            $scope.metaResults.totalShards = results._shards.total;
            if (results._shards.failed > 0) {
                $scope.metaResults.failedShards = results._shards.failed;
                $scope.metaResults.errors = [];
                angular.forEach(results._shards.failures, function(failure) {
                    $scope.metaResults.errors.push(failure.index + " - " + failure.reason);
                });
                
            }
        },handleErrors);
    };

    $scope.addSearchField = function () {
        var searchField = {};
        searchField.field = $scope.search.advanced.newField;
        searchField.text = $scope.search.advanced.newText;
        $scope.search.advanced.searchFields.push(searchField);
    };

    $scope.removeSearchField = function (index) {
        $scope.search.advanced.searchFields.splice(index, 1);
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
        var modalInstance = $modal.open(opts);
        modalInstance.result.then(function (result) {
            if (result) {
                $scope.search.facets.push(result);
            }
        }, function () {
            // Nothing to do here
        });
    };

    $scope.removeFacetField = function (index) {
        $scope.search.facets.splice(index, 1);
    };

    $scope.saveQuery = function () {
        queryStorage.saveSearch(angular.copy($scope.search));
    };

    $scope.loadQuery = function () {
        queryStorage.loadSearch(function (data) {
            $scope.search = angular.copy(data);
        });
    };

    $scope.addFilter = function (key, value) {
        if (!$scope.search.selectedFacets) {
            $scope.search.selectedFacets = [];
        }
        $scope.search.selectedFacets.push({"key": key, "value": value});
        $scope.doSearch();
    };

    $scope.checkSelectedFacet = function (key, value) {
        if (!$scope.search.selectedFacets) {
            return false;
        }
        for (var i = 0; i < $scope.search.selectedFacets.length; i++) {
            var selectedFacet = $scope.search.selectedFacets;
            if (selectedFacet[i].key === key && selectedFacet[i].value === value) {
                return true;
            }
        }
        return false;
    };

    $scope.removeFilter = function (key, value) {
        if (!$scope.search.selectedFacets) {
            return;
        }
        for (var i = 0; i < $scope.search.selectedFacets.length; i++) {
            var selectedFacet = $scope.search.selectedFacets;
            if (selectedFacet[i].key === key && selectedFacet[i].value === value) {
                $scope.search.selectedFacets.splice(i, 1);
            }
        }
        $scope.doSearch();
    };

    $scope.obtainFacetByKey = function (key) {
        for (var i = 0; i < $scope.search.facets.length; i++) {
            var currentFacet = $scope.search.facets[i];
            if (currentFacet.field === key) {
                return currentFacet;
            }
        }
        return null;
    }

    function searchPart() {
        var executedQuery;
        if ($scope.search.doAdvanced && $scope.search.advanced.searchFields.length > 0) {
            var tree = {};
            for (var i = 0; i < $scope.search.advanced.searchFields.length; i++) {
                var searchField = $scope.search.advanced.searchFields[i];
                var fieldForSearch = $scope.fields[searchField.field];
                recurseTree(tree, searchField.field, searchField.text);
                if (fieldForSearch.nestedPath) {
                    defineNestedPathInTree(tree, fieldForSearch.nestedPath, fieldForSearch.nestedPath);
                }
            }
            executedQuery = constructQuery(tree);

        } else if ($scope.search.simple && $scope.search.simple.length > 0) {
            executedQuery = {"simple_query_string":{"query":$scope.search.simple,"fields":["_all"],"analyzer":"snowball"}};
        } else {
            executedQuery = {"matchAll": {}};
        }

        return executedQuery;
    }

    function constructQuery(tree) {
        var props = Object.getOwnPropertyNames(tree);
        var boolQuery = {};
        boolQuery.bool = {};
        boolQuery.bool.must = [];
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            if (tree[prop] instanceof Object) {
                boolQuery.bool.must.push(constructQuery(tree[prop]));
            } else if (!(prop.substring(0, 1) === "_")) {
                var fieldName = prop;
                if (tree._nested) {
                    fieldName = tree._nested + "." + fieldName;
                }
                var matchQuery = {};
                matchQuery[fieldName] = tree[prop];
                boolQuery.bool.must.push({"match":matchQuery});
            }
        }

        var returnQuery;
        if (tree._nested) {
            var nestedQuery = {};
            nestedQuery.nested = {};
            nestedQuery.nested.path = tree._nested;
            nestedQuery.nested.query = boolQuery;
            returnQuery = nestedQuery;
        } else {
            returnQuery = boolQuery;
        }

        return returnQuery;
    }

    function defineNestedPathInTree(tree, path, nestedPath) {
        var pathItems = path.split(".");
        if (pathItems.length > 1) {
            defineNestedPathInTree(tree[pathItems[0]], pathItems.splice(1).join("."), nestedPath);
        } else {
            tree[path]._nested = nestedPath;
        }

    }

    function recurseTree(tree, newKey, value) {
        var newKeys = newKey.split(".");

        if (newKeys.length > 1) {
            if (!tree.hasOwnProperty(newKeys[0])) {
                tree[newKeys[0]] = {};
            }
            recurseTree(tree[newKeys[0]], newKeys.splice(1).join("."), value);
        } else {
            if (!tree.hasOwnProperty(newKey)) {
                tree[newKey] = value;
            }
        }
    }


    function filterChosenFacetPart() {

        if ($scope.search.selectedFacets && $scope.search.selectedFacets.length > 0) {
            var filterQuery = {};
            var selectedFacets = $scope.search.selectedFacets;
            var filters = [];
            for (var i = 0; i < selectedFacets.length; i++) {
                var facet = determineFacet(selectedFacets[i].key);
                var facetType = facet.facetType;
                if (facetType === "term") {
                    var termFilter = {"term":{}};
                    termFilter.term[selectedFacets[i].key] = selectedFacets[i].value;
                    filters.push(termFilter);
                } else if (facetType === "datehistogram") {
                    var fromDate = new Date(selectedFacets[i].value);
                    if (facet.interval === 'year') {
                        fromDate.setFullYear(fromDate.getFullYear() + 1);
                    } else if (facet.interval === 'month') {
                        fromDate.setMonth(fromDate.getMonth() + 1);
                    } else if (facet.interval === 'week') {
                        fromDate.setDate(fromDate.getDate() + 7);
                    } else if (facet.interval === 'day') {
                        fromDate.setDate(fromDate.getDate() + 1);
                    } else if (facet.interval === 'hour') {
                        fromDate.setHours(fromDate.getHours() + 1);
                    } else if (facet.interval === 'minute') {
                        fromDate.setMinutes(fromDate.getMinutes() + 1);
                    }
                    var rangeFilter = {"range":{}};
                    rangeFilter.range[selectedFacets[i].key] = {"from":selectedFacets[i].value,"to":fromDate.getTime()};
                    filters.push(rangeFilter);
                } else if (facetType === "histogram") {
                    var rangeFilter = {"range":{}};
                    rangeFilter.range[selectedFacets[i].key] = {"from":selectedFacets[i].value,"to":selectedFacets[i].value + facet.interval};
                    filters.push(rangeFilter);
                }
            }
            filterQuery.and = filters;

            return filterQuery;
        }
        return null;
    }

    function determineFacet(key) {
        for (var i = 0; i < $scope.search.facets.length; i++) {
            var currentFacet = $scope.search.facets[i];
            if (currentFacet.field === key) {
                return currentFacet;
            }
        }
    }

    function handleErrors(errors) {
        $scope.metaResults.failedShards = 1;
        $scope.metaResults.errors = [];
        if (errors.message && typeof errors.message === "object") {
            if (errors.message.hasOwnProperty('message')) {
                $scope.metaResults.errors.push(errors.message.message);
            }
        } else {
            $scope.metaResults.errors.push(errors.message);
        }
    }
}
SearchController.$inject = ['$scope', 'elastic', 'configuration', 'facetBuilder', '$modal', 'queryStorage'];