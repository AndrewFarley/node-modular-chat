var MyApp = angular.module('MyApp', []);
angular.module('MyApp').factory('MyService', ['$q', '$rootScope', function($q, $rootScope) {
    // We return this object to anything injecting our service
    var Service = {};
    // Keep all pending requests here until they get responses
    var callbacks = {};
    // Create a unique callback ID to map requests to responses
    var currentCallbackId = 0;
    // Create our websocket object with the address to the websocket
    var ws = new WebSocket("ws://nexination.com:8080/socket/");
    
          /*
        Cleans JSON RPC 2.0 objects for new use.
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
    
    ws.onopen = function(){  
        console.log("Socket has been opened!");  
    };
    
    ws.onmessage = function(message) {
        listener(JSON.parse(message.data));
    };

    function sendRequest(request) {
      var defer = $q.defer();
      var callbackId = request.id;
      callbacks[callbackId] = {
        time: new Date(),
        cb:defer
      };
      console.log('Sending request', request);
      ws.send(JSON.stringify(request));
      return defer.promise;
    }

    function listener(data) {
      var messageObj = data;
      console.log("Received data from websocket: ", messageObj);
      // If an object exists with id in our callbacks object, resolve it
      if(callbacks.hasOwnProperty(messageObj.id)) {
        console.log(callbacks[messageObj.id]);
        $rootScope.$apply(callbacks[messageObj.id].cb.resolve(messageObj.params));
        console.log($rootScope);
        delete callbacks[messageObj.callbackID];
      }
    }

    // Define a "getter" for getting customer data
    Service.getCustomers = function() {
        var request = getCleanRpcObject('request');
        request.method = 'postMessage';
        request.params.name = 'DaftPink';
        request.params.message = 'Earl of gray!';
        // Storing in a variable for clarity on what sendRequest returns
        var promise = sendRequest(request); 
        return promise;
    }

    return Service;
}]);

angular.module('MyApp')
  .controller('customerList', ['MyService', '$scope', function(MyService, $scope){
    $scope.customers = MyService.getCustomers();
  }]);