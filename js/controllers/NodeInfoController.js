'use strict';

function NodeInfoController($scope, elastic, $routeParams) {
    var nodeId = $routeParams.nodeId;
    elastic.nodeInfo(nodeId, function (data) {
        $scope.nodes = data;
    });
}
NodeInfoController.$inject = ['$scope', 'elastic', '$routeParams'];