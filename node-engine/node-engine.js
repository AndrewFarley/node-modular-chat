/**
 * Create websocketservice
 */
var wss = require('ws').Server;
var WebSocketServer = new wss({"port": parseInt(process.argv[0])});

var SockLib = {
    "data": {
        "idCounter": 0
        , "passThroughList": {
            "nudge": true
            , "postMessage": true
        }
        , "functionList": {
            "requestReplay": true
        }
        , "messageReplay": []
    }
    , "handlers" : {
        "connection": function(webSocket) {
            var main = this.main;
            webSocket.on('open', main.handlers.open);
            webSocket.on('close', main.handlers.close);
            webSocket.on('error', main.handlers.error);
            webSocket.on('message', main.handlers.message);
            main.handlers.updateClients();
        }
        , "open": function(message) {
            console.log(message);
        }
        , "close": function(message) {
            var main = this.main;
            main.handlers.updateClients();
            console.log(message);
        }
        , "error": function(error) {
            console.log(error);
        }
        , "message": function(message) {
            var main = this.main;
            var parsedMessage = JSON.parse(message);
            // Checks a message if it is allowed for broadcast
            if(main.data.passThroughList[parsedMessage.method]) {
                // Adds broadcast messages to replay list
                main.addReplay(message);
                // Broadcasts messages
                WebSocketServer.clients.forEach(function(client) {
                    if(client !== webSocket) {
                        client.send(message);
                    };
                });
            }
            // Checks if a message is allowed to communicate with the server
            else if(main.data.functionList[parsedMessage.method]) {
                // Executes a server function, per request from a client
                main[parsedMessage.method](webSocket, parsedMessage.params);
            };
            // Logs type of message with parameters
            if(main.data.passThroughList.hasOwnProperty(parsedMessage.method)) {
                console.log('Call: ' + parsedMessage.method);
            };
        }
        , "updateClients": function() {
            var main = this.main;
            WebSocketServer.clients.forEach(main.updateUserCount);
        }
    }
    , "__construct": function() {
        this.handlers.main = this;
        var main = this;
        WebSocketServer.on('connection', main.handlers.connection);
    }
    , "updateUserCount": function(client) {
        var request = this.getCleanRpcObject('request');
        console.log('Users: ' + request.id);
        request.method = 'setPeerCount';
        request.params.peerCount = WebSocketServer.clients.length.toString();
        client.send(JSON.stringify(request));
        return false;
    }
    , "getCleanRpcObject": function(objectType) {
        this.data.idCounter += 1;
        var rpc2 = {"jsonrpc": "2.0", "id": this.data.idCounter};
        
        if(objectType === 'result') {
            rpc2.result = {};
        } else if(objectType === 'error') {
            rpc2.error = WebSock.objError;
        } else if(objectType === 'request') {
            rpc2.method = '';
            rpc2.params = {};
        };
        
        return rpc2;
    }
    , "addReplay": function(message) {
        if(message !== undefined) {
            this.data.messageReplay.unshift(message);
            if(this.data.messageReplay.length > 100) {
                this.data.messageReplay.pop();
            };
            return true;
        };
        return false;
    }
    , "requestReplay": function(client, params) {
        var maxReplay = this.data.messageReplay.length;
        if(params.hasOwnProperty('replayCount')) {
            maxReplay = (params.replayCount < maxReplay ? params.replayCount : maxReplay);
        };
        for(var i = maxReplay-1; i >= 0; i -= 1) {
            client.send(this.data.messageReplay[i]);
        };
        return false;
    }
};
SockLib.__construct();