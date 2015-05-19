/*
    Create websocketservice
*/
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({"port": 8080});

/*
    Initial setup of websocketservice and logging
*/
wss.on('connection', function connection(ws) {
    /*
        Only logs opened connections
    */
    ws.on('open', function incoming(message) {
        console.log('open');
    });
    /*
        Alerts users on a user disconnect
    */
    ws.on('close', function incoming(message) {
        wss.clients.forEach(MessageHandler.updateUserCount);
        console.log('User disconnected');
    });
    /*
        Only logs errors
    */
    ws.on('error', function incoming(error) {
        console.log(error);
    });
    /*
        Parses the message logic and does different things dependent on the message
    */
    ws.on('message', function incoming(message) {
        var parsedMessage = JSON.parse(message);
        // Checks a message if it is allowed for broadcast
        if(MessageHandler.data.passThroughList[parsedMessage.method]) {
            // Adds broadcast messages to replay list
            MessageHandler.addReplay(message);
            // Broadcasts messages
            wss.clients.forEach(function(client) {
                if(client !== ws) {
                    client.send(message);
                };
            });
        }
        // Checks if a message is allowed to communicate with the server
        else if(MessageHandler.data.functionList[parsedMessage.method]) {
            // Executes a server function, per request from a client
            MessageHandler[parsedMessage.method](ws, parsedMessage.params);
        };
        // Logs type of message with parameters
        console.log(parsedMessage.method + ': ' + JSON.stringify(parsedMessage.params));
    });
    // Alerts all users on a connect
    wss.clients.forEach(MessageHandler.updateUserCount);
    console.log('User connected');
});

/*
    Data handling class for the websocketservice
*/
var MessageHandler = {
    /*
        Data variables used by the server
    */
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
    /*
        Cleans JSON RPC 2.0 objects for new use.
    */
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
    /*
        Sends a message to all users about a user disconnecting/connecting
    */
    , "updateUserCount": function(client) {
        var request = MessageHandler.getCleanRpcObject('request');
        console.log(request.id);
        request.method = 'setPeerCount';
        request.params.peerCount = wss.clients.length.toString();
        client.send(JSON.stringify(request));
        return false;
    }
    /*
        Automatically builds up an array of previous messages up to 25
    */
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
    /*
        On request, prints out the x last messages recorded to a single user
    */
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