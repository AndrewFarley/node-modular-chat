/**
 * Create websocketservice
 */

var SockLib = new function() {
    var main = this;
    var wss = require('ws').Server;
    var JsonRpc = require('../chat/js/JsonRpc.js').JsonRpc;
    var WebSocketServer = new wss({"port": parseInt(process.argv[2])});

    this.data = {
        "idCounter": 0
        , "passThroughList": {
            "nudge": true
            , "postMessage": true
        }
        , "functionList": {
            "requestReplay": true
        }
        , "messageReplay": []
    };
    this.handlers = {
        "connection": function(webSocket) {
            webSocket.on('open', function(message) {main.handlers.open(message, webSocket)});
            webSocket.on('close', function(message) {main.handlers.close(message, webSocket)});
            webSocket.on('error', function(message) {main.handlers.error(message, webSocket)});
            webSocket.on('message', function(message) {main.handlers.message(message, webSocket)});
            main.handlers.updateClients();
        }
        , "open": function(message) {
            console.log(message);
        }
        , "close": function(message) {
            main.handlers.updateClients();
            console.log(message);
        }
        , "error": function(error) {
            console.log(error);
        }
        , "message": function(message, webSocket) {
            var jsonRpc = main.JsonRpc.parse(message);
            // Checks a message if it is allowed for broadcast
            if(main.data.passThroughList[jsonRpc.method]) {
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
            else if(main.data.functionList[jsonRpc.method]) {
                // Executes a server function, per request from a client
                main[jsonRpc.method](webSocket, jsonRpc.params);
            };
            // Logs type of message with parameters
            if(main.data.passThroughList.hasOwnProperty(jsonRpc.method)) {
                console.log('Call: ' + jsonRpc.method + JSON.stringify(jsonRpc.params));
            };
        }
        , "updateClients": function() {
            WebSocketServer.clients.forEach(main.updateUserCount);
        }
    };
    this.__construct = function() {
        main.JsonRpc = new JsonRpc();
        WebSocketServer.on('connection', this.handlers.connection);
    };
    this.updateUserCount = function(client) {
        var jsonRpc = main.JsonRpc.getRequest();;
        console.log('Users: ' + jsonRpc.id);
        jsonRpc.method = 'setPeerCount';
        jsonRpc.params.peerCount = WebSocketServer.clients.length.toString();
        client.send(JSON.stringify(jsonRpc));
        return false;
    };
    this.addReplay = function(message) {
        if(message !== undefined) {
            this.data.messageReplay.unshift(message);
            if(this.data.messageReplay.length > 100) {
                this.data.messageReplay.pop();
            };
            return true;
        };
        return false;
    };
    this.requestReplay = function(client, params) {
        var maxReplay = this.data.messageReplay.length;
        if(params.hasOwnProperty('replayCount')) {
            maxReplay = (params.replayCount < maxReplay ? params.replayCount : maxReplay);
        };
        for(var i = maxReplay-1; i >= 0; i -= 1) {
            client.send(this.data.messageReplay[i]);
        };
        return false;
    };
};
SockLib.__construct();