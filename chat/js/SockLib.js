/**
 * Node modular chat frontend socket library
 *
 * @author Kristian B
 */
var SockLib = new function() {
    var main = this;
    /* DOM selector group */
    this.domSelector = {
        "chatMessageDisplay": {}
        , "userCount": {}
        , "inputField": {}
        , "buttonContainer": {}
    };
    /* Misc options */
    this.options = {
        "messageCount": 0
        , "parameters": {}
        , "audioTags": {}
        , "error": {
            "code": ""
            , "message": ""
            , "data": ""
        }
    };
    /* Socket connector */
    this.socket = {};
    /* Message string parser */
    this.stringParse = [
        {
            "regex": /\S+(youtube)\S+v=([a-zA-Z0-9_\-]+)\S*/gim
            , "replace": '<iframe style="youtubeFrame" width="320" height="320" src="//www.youtube.com/embed/$2" frameborder="0" allowfullscreen></iframe>'
        }
        , {
            "regex": /!!(\S+)!!/gim
            , "replace": '<img class="images" src="$1" />'
        }
        , {
            "regex": /\s(http[s]?:\S+)/gim
            , "replace": ' <a href="$1" target="_blank">$1</a>'
        }
    ];
    
    /**
     * Locates all appropriate DOM, fetches and sets default uri parameters,
     * locates audio tags and executes all construct functions.
     *
     * @constructor
     */
    this.__construct = function() {
        main.JsonRpc = new JsonRpc();
        // Loads needed dom objects into object
        for(var dom in this.domSelector) {
            this.domSelector[dom] = document.getElementById(dom);
            this.domSelector[dom].removeAttribute('id');
        };
        // Loads get parameters into object
        var parameters =  window.location.search.substr(1).split('&');
        for(var i = 0; i < parameters.length; i += 1) {
            var tempString = parameters[i].split('=');
            this.options.parameters[tempString[0]] = tempString[1];
        };
        // Sets default name, port and host, in case none were set through parameters
        if(!this.options.parameters.hasOwnProperty('name')) {
            this.options.parameters.name = 'McElroy';
        };
        if(!this.options.parameters.hasOwnProperty('port')) {
            this.options.parameters.port = '8080';
        };
        if(!this.options.parameters.hasOwnProperty('host')) {
            this.options.parameters.host = document.location.host;
        };
        // Finds all audio tags and arranges them in an object list for use later
        var audioList = document.getElementsByTagName('audio');
        for(var i = 0; i < audioList.length; i += 1) {
            var tempObject = audioList[i];
            var tempString = tempObject.getAttribute('name');
            if(tempString !== undefined) {
                this.options.audioTags[tempString] = tempObject;
            };
        };
        // Opens socket connection
        this.connectSocket();
        // Sets an a function to reset messages received when you leave the window
        window.onblur = function() {SockLib.updateWindow(0);};
        // Sets a keep alive function that calls it self, to stop the connection from closing
        this.keepItAlive();
        // Set default volume to 10
        this.setVolume(10);
        
        return false;
    };
    /**
     * Initiates a socket connection, based on the options.parameters
     */
    this.connectSocket = function() {
        var uri = 'ws://' + this.options.parameters.host + ':' + this.options.parameters.port + '/nexus/socket';
        this.socket = new WebSocket(uri);
        this.socket.onerror = function(eventObject) {SockLib.onError(eventObject);};
        this.socket.onclose = function(eventObject) {SockLib.onError(eventObject);};
        this.socket.onmessage = function(eventObject) {SockLib.onMessage(eventObject);};
        this.socket.onopen = function(eventObject) {SockLib.onOpen(eventObject);};
        return false;
    };
    /**
     * Checks if enter is hit in the input box and sends it when enter is pressed,
     * this is done because it is attached to an event on the input tag.
     *
     * @param {Object} eventObject - JS Event object
     */
    this.checkSendText = function(eventObject) {
        eventObject.target = (eventObject.target ? eventObject.target : eventObject.srcElement);
        if(eventObject.keyCode === 13) {
            this.sendText(eventObject.target.value);
            eventObject.target.value = '';
        };
        return false;
    };
    /**
     * Hides all messages
     */
    this.clearMessages = function() {
        var messageList = this.domSelector.chatMessageDisplay.childNodes;
        for(var i = 0; i < messageList.length; i += 1) {
            if(typeof messageList[i] === 'object') {
                if(messageList[i].style.display === 'none') {
                    break;
                };
                messageList[i].style.display = 'none';
            };
        };
        return false;
    };
    /**
     * Volume adjuster
     *
     * @param {number} volumePercentage - Volume from 0 to 100 percent
     */
    this.setVolume = function(volumePercentage) {
        var volume = volumePercentage / 100;
        for(var i in this.options.audioTags) {
            this.options.audioTags[i].volume = volume;
        };
        return false;
    };
    /**
     * Sets message counter or adds 1 to the counter
     *
     * @param {number} counter - Number to set message counter to
     */
    this.updateWindow = function(counter) {
        if(typeof counter === 'number') {
            this.options.messageCount = counter;
        }
        else {
            this.options.messageCount += 1;
        };
        document.title = this.options.messageCount + ' new';
        
        return false;
    };
    /**
     * Plays mp3 notification, from it's notification name
     *
     * @param {string} playSelection - Notification name
     */
    this.playNotifications = function(playSelection) {
        this.options.audioTags[playSelection].currentTime = 0;
        this.options.audioTags[playSelection].play();
        
        return false;
    };
    /**
     * Prints last x messages
     *
     * @param {number} replayCount - The amount of messages to replay
     */
    this.replay = function(replayCount) {
        var jsonRpc = main.JsonRpc.getRequest();
        jsonRpc.method = 'requestReplay';
        jsonRpc.params.replayCount = replayCount;
        SockLib.socket.send(JSON.stringify(jsonRpc));
        return false;
    };
    /**
     * Executes a keep alive to keep the connection up
     */
    this.keepItAlive = function() {
        var jsonRpc = main.JsonRpc.getRequest();
        jsonRpc.method = 'keepAlive';
        try {
            SockLib.socket.send(JSON.stringify(jsonRpc));
        }
        catch (error) {
            this.options.error.code = "" + error.code;
            this.options.error.message = error.name;
            this.options.error.data = error.stack;
        };
        setTimeout("SockLib.keepItAlive();", 30000);
        
        return false;
    };
    /**
     * Sends a nudge to other clients.
     */
    this.sendNudge = function() {
        var jsonRpc = main.JsonRpc.getRequest();
        jsonRpc.method = 'nudge';
        SockLib.socket.send(JSON.stringify(jsonRpc));
        
        return false;
    };
    /**
     * Plays notification when nudges are received.
     *
     * @param {Object} eventObject - JS Event object
     * @param {Object} parameters - JSON RPC parameters
     */
    this.nudge = function(eventObject, parameters) {
        SockLib.playNotifications('nudge');
        
        return false;
    };
    /**
     * Sets the peer count if received and notifies if a user left or joined.
     *
     * @param {Object} eventObject - JS Event object
     * @param {Object} parameters - JSON RPC parameters
     */
    this.setPeerCount = function(eventObject, parameters) {
        var count = parseInt(this.domSelector.userCount.innerHTML);
        var playSelection = 'connected';
        if(count > parameters.peerCount) {
            playSelection = 'disconnected';
        };
        this.domSelector.userCount.innerHTML = parameters.peerCount;
        SockLib.playNotifications(playSelection);
        
        return false;
    };
    /**
     * Displays received messages and plays a notification.
     *
     * @param {Object} eventObject - JS Event object
     * @param {Object} parameters - JSON RPC parameters
     */
    this.postMessage = function(eventObject, parameters) {
        this.updateWindow();
        this.setText(parameters.name + ': ' + parameters.message);
        this.playNotifications('notify');
        
        return false;
    };
    /**
     * Receives all messages sent from the server.
     *
     * @param {Object} eventObject - WebSocket Event
     */
    this.onMessage = function(eventObject) {
        var rpc = main.JsonRpc.parse(eventObject.data);
        
        if(rpc.hasOwnProperty('method')) {
            // JSON RPC automatic callback.
            if(SockLib.hasOwnProperty(rpc.method)) {
                SockLib[(rpc.method)](eventObject, rpc.params);
            };
        }
        else if(rpc.hasOwnProperty('result')) {
            //  Add result logic.
        }
        else if(rpc.hasOwnProperty('error')) {
            //  Add error logic.
        };
        
        return false;
    };
    /**
     * Sends a message, wrapped in a JSON RPC object.
     *
     * @param {string} message - Input message
     */
    this.sendText = function (message) {
        var jsonRpc = main.JsonRpc.getRequest();
        jsonRpc.method = 'postMessage';
        jsonRpc.params = {
            "name": SockLib.options.parameters.name
            , "message": message
        };
        
        this.setText(jsonRpc.params.name + ': ' + jsonRpc.params.message);
        
        SockLib.socket.send(JSON.stringify(jsonRpc));
        return false;
    };
    /**
     * Appends a paragraph message and username to the chat div.
     *
     * @param {string} message - Message to insert
     */
    this.setText = function(message) {
        var domParagraph = document.createElement('p');
        for(var i = 0; i < this.stringParse.length; i += 1) {
            var parse = this.stringParse[i];
            message = message.replace(parse.regex, parse.replace);
        };
        domParagraph.innerHTML = message;
        
        if(SockLib.domSelector.chatMessageDisplay.hasChildNodes()) {
            SockLib.domSelector.chatMessageDisplay.insertBefore(domParagraph, this.domSelector.chatMessageDisplay.childNodes[0]);
        }
        else {
            SockLib.domSelector.chatMessageDisplay.appendChild(domParagraph);
        };
        
        return false;
    };
    /**
     * Executes if an error in the socket is received.
     *
     * @param {Object} eventObject - WebSocket Event
     */
    this.onError = function(eventObject) {
        SockLib.setText('Error: ' + eventObject.type);
        
        return false;
    };
    /**
     * Executes when a socket connection is established.
     */
    this.onOpen = function() {
        this.setText('!Connected to socket!');
        return false;
    };
};
// Initiates the websocket library.
SockLib.__construct();