'use strict';

function ConfigDialogCtrl($scope, $modalInstance, configuration) {
    $scope.configuration = configuration;

    $scope.close = function (result) {
        $modalInstance.close($scope.configuration);
    };

}