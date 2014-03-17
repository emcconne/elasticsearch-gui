'use strict';

// Declare app level module which depends on filters, and services
var esGui = angular.module('esGui', ['ngRoute','esGui.filters', 'esGui.services', 'esGui.directives', 'ui.bootstrap', 'dangle','elasticsearch']);

esGui.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/dashboard', 
        {
            templateUrl: 'partials/dashboard.html', 
            controller: esGui.DashboardController
        });
    $routeProvider.when('/node/:nodeId', 
        {
            templateUrl: 'partials/node.html', 
            controller: esGui.NodeInfoController}
        );
    $routeProvider.when('/search', 
        {   
            templateUrl: 'partials/search.html', 
            controller: esGui.SearchController
        });
    $routeProvider.when('/query', 
        {
            templateUrl: 'partials/query.html', 
            controller: esGui.QueryController
        });
    $routeProvider.when('/graph', 
        {
            templateUrl: 'partials/graph.html', 
            controller: esGui.GraphController
        });
    $routeProvider.when('/tools', 
        {
            templateUrl: 'partials/tools.html', 
            controller: esGui.ToolController
        });
    $routeProvider.when('/about', 
        {
            templateUrl: 'partials/about.html'
        });
    $routeProvider.otherwise({redirectTo: '/dashboard'});
}]);

esGui.value('localStorage', window.localStorage);

esGui.factory('$exceptionHandler', function($injector) {
    return function(exception, cause) {
        var errorHandling = $injector.get('errorHandling');
        errorHandling.add(exception.message);
        throw exception;
    };
});