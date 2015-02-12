var sockItToMe = angular.module('sockItToMe', []);
sockItToMe.factory('socket', ['$q', '$rootScope', function($q, $rootScope) {
    /*
     * Stores all the data sent from the websocket server
     */
    var entryData = {
        "postMessage": []
        , "setPeerCount": {}
        , "nudge": {}
    };
    /*
     * Access control object for websocket messages
     */
    var type = {
        "add": {
            "postMessage": true
        }
        , "set": {
            "setPeerCount": true
            , "nudge": true
        }
    };
    /*
     * Callback ID used to track amount of messages sent
     */
    var currentCallbackId = 0;
    /*
     * Cleans JSON RPC 2.0 objects for new use.
     */
    var getCleanRpcObject = function(objectType) {
        currentCallbackId += 1;
        var rpc2 = {"jsonrpc": "2.0", "id": currentCallbackId};
        
        if(objectType === 'result') {
            rpc2.result = {};
        } else if(objectType === 'error') {
            rpc2.error = WebSock.objError;
        } else if(objectType === 'request') {
            rpc2.method = '';
            rpc2.params = {};
        };
        
        return rpc2;
    };
    /*
     * Sets up the data handler for use on incoming websocket messages
     */
    var dataProcessor = function(rpc2) {
        console.log(rpc2);
        if(rpc2.hasOwnProperty("method") && entryData.hasOwnProperty(rpc2.method)) {
            if(type.set[rpc2.method] !== undefined) {
                $rootScope.$apply(function() {
                    entryData[rpc2.method] = rpc2.params;
                });
                $rootScope.$apply();
            }
            else if(type.add[rpc2.method] !== undefined) {
                $rootScope.$apply(function() {
                    entryData[rpc2.method].unshift(rpc2.params);
                });
            };
        };
    };
    
    /*
     * Initiates a websocket connection and sets up all the necessary message handlers
     */
    var ws = new WebSocket("ws://nexination.com:8080/socket/");
    ws.onopen = function(){  
        console.log("Socket has been opened!");  
    };
    
    ws.onmessage = function(message) {
        dataProcessor(JSON.parse(message.data));
    };
    
    /*
     * Returns the factory data object
     */
    return entryData;
}]);

sockItToMe.controller('messageController', ['$scope', 'socket', function($scope, socket){
    $scope.socket = socket;
}]);