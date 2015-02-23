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
            rpc2.error = '';
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
        return false;
    };
    /*
     * Sends data down the stream
     */
    var sendData = function(method, value) {
        var data = getCleanRpcObject('request');
        data.method = method;
        data.params = {"name": "FuckItyBob", "message": value};
        ws.send(JSON.stringify(data));
        return false;
    };
    entryData.sendData = sendData;
    
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
    $scope.buttons = [
        {
            "name": "Volume Low"
            , "face": "L"
            , "style": ""
        }
        , {
            "name": "Volume Medium"
            , "face": "M"
            , "style": ""
        }
        , {
            "name": "Volume High"
            , "face": "H"
            , "style": ""
        }
        , {
            "name": "Nudge user"
            , "face": "Nudge"
            , "style": ""
        }
        , {
            "name": "Clear messages"
            , "face": "Clear"
            , "style": "right:50px;"
        }
        , {
            "name": "Show/Hide icons"
            , "face": "Icons"
            , "style": "right:50px;"
        }
    ];
    $scope.sounds = {
        "message": {
            "name": "hello"
            , "source": "sounds/hello.mp3"
        }
        , "nudge": {
            "name": "boom"
            , "source": "sounds/boom.mp3"
        }
        , "connected": {
            "name": "connected"
            , "source": "sounds/connected.mp3"
        }
        , "disconnected": {
            "name": "disconnected"
            , "source": "sounds/disconnected.mp3"
        }
    };
    $scope.buttonHandler = function($event) {
        console.log($event.target ? $event.target : $event.srcElement);
        
        return false;
    };
    $scope.messageChecker = function($event) {
        if($event.keyCode === 13) {
            $scope.sounds.message.dom.play();
            console.log($scope.sounds);
            //socket.sendData('postMessage', $event.target.value);
            $event.target.value = '';
        };
        return false;
    };
}]);

sockItToMe.directive('addDomToObject', function() {
    return {
        "link": function($scope, $element, $attrs) {
            //console.log($attrs);
            $scope[$attrs.addDomToObject].dom = $element[0];
        }
    };
});
