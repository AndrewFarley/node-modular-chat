/**
 * Create websocketservice
 */
var wss = require('ws').Server;
var JsonRpc = require('../chat/js/JsonRpc.js').JsonRpc;
var WebSocketServer = new wss({"port": parseInt(process.argv[2])});

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
            var main = SockLib;
            main.data.webSocket = webSocket;
            console.log(main);
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
            var main = SockLib;
            main.handlers.updateClients();
            console.log(message);
        }
        , "error": function(error) {
            console.log(error);
        }
        , "message": function(message) {
            var main = SockLib;
            var jsonRpc = JsonRpc.parse(message);
            // Checks a message if it is allowed for broadcast
            if(main.data.passThroughList[jsonRpc.method]) {
                // Adds broadcast messages to replay list
                main.addReplay(message);
                // Broadcasts messages
                WebSocketServer.clients.forEach(function(client) {
                    if(client !== main.data.webSocket) {
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
                console.log('Call: ' + jsonRpc.method);
            };
        }
        , "updateClients": function() {
            var main = SockLib;
            WebSocketServer.clients.forEach(main.updateUserCount);
        }
    }
    , "__construct": function() {
        WebSocketServer.on('connection', this.handlers.connection);
    }
    , "updateUserCount": function(client) {
        var main = SockLib;
        var jsonRpc = JsonRpc.getRequest();;
        console.log('Users: ' + jsonRpc.id);
        jsonRpc.method = 'setPeerCount';
        jsonRpc.params.peerCount = WebSocketServer.clients.length.toString();
        client.send(JSON.stringify(jsonRpc));
        return false;
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