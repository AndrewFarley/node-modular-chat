var SockLib = new function() {
    var main = this;
    this.domSelector = {
        "chatMessageDisplay": {}
        , "userCount": {}
        , "inputField": {}
        , "buttonContainer": {}
    };
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
    this.socket = {};
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
    
    this.__construct = function() {
        main.JsonRpc = new JsonRpc();
        
        for(var dom in this.domSelector) {
            this.domSelector[dom] = document.getElementById(dom);
            this.domSelector[dom].removeAttribute('id');
        };
        
        var parameters =  window.location.search.substr(1).split('&');
        for(var i = 0; i < parameters.length; i += 1) {
            var tempString = parameters[i].split('=');
            this.options.parameters[tempString[0]] = tempString[1];
        };
        
        if(!this.options.parameters.hasOwnProperty('name')) {
            this.options.parameters.name = 'McElroy';
        };
        if(!this.options.parameters.hasOwnProperty('port')) {
            this.options.parameters.port = '8080';
        };
        if(!this.options.parameters.hasOwnProperty('host')) {
            this.options.parameters.host = document.location.host;
        };
        
        var audioList = document.getElementsByTagName('audio');
        for(var i = 0; i < audioList.length; i += 1) {
            var tempObject = audioList[i];
            var tempString = tempObject.getAttribute('name');
            if(tempString !== undefined) {
                this.options.audioTags[tempString] = tempObject;
            };
        };
        
        this.connectSocket();
        
        window.onblur = function() {SockLib.updateWindow(0);};
        
        this.keepItAlive();
        
        this.setVolume(10);
        
        return false;
    };
    this.connectSocket = function() {
        var uri = 'ws://' + this.options.parameters.host + ':' + this.options.parameters.port + '/nexus/socket';
        this.socket = new WebSocket(uri);
        this.socket.onerror = function(eventObject) {SockLib.onError(eventObject);};
        this.socket.onclose = function(eventObject) {SockLib.onError(eventObject);};
        this.socket.onmessage = function(eventObject) {SockLib.onMessage(eventObject);};
        this.socket.onopen = function(eventObject) {SockLib.onOpen(eventObject);};
        return false;
    };
    this.checkSendText = function(eventObject) {
        eventObject.target = (eventObject.target ? eventObject.target : eventObject.srcElement);
        if(eventObject.keyCode === 13) {
            this.sendText(eventObject.target.value);
            eventObject.target.value = '';
        };
        return false;
    };
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
    this.setVolume = function(volumePercentage) {
        var volume = volumePercentage / 100;
        for(var i in this.options.audioTags) {
            this.options.audioTags[i].volume = volume;
        };
        return false;
    };
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
    this.playNotifications = function(playSelection) {
        this.options.audioTags[playSelection].currentTime = 0;
        this.options.audioTags[playSelection].play();
        
        return false;
    };
    this.replay = function(replayCount) {
        var jsonRpc = main.JsonRpc.getRequest();
        jsonRpc.method = 'requestReplay';
        jsonRpc.params.replayCount = replayCount;
        SockLib.socket.send(JSON.stringify(jsonRpc));
        return false;
    };
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
    this.sendNudge = function() {
        var jsonRpc = main.JsonRpc.getRequest();
        jsonRpc.method = 'nudge';
        SockLib.socket.send(JSON.stringify(jsonRpc));
        
        return false;
    };
    this.nudge = function(eventObject, parameters) {
        SockLib.playNotifications('nudge');
        
        return false;
    };
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
    this.postMessage = function(eventObject, parameters) {
        this.updateWindow();
        this.setText(parameters.name + ': ' + parameters.message);
        this.playNotifications('notify');
        
        return false;
    };
    this.onMessage = function(eventObject) {
        var rpc = main.JsonRpc.parse(eventObject.data);
        
        if(rpc.hasOwnProperty('method')) {
            if(SockLib.hasOwnProperty(rpc.method)) {
                SockLib[(rpc.method)](eventObject, rpc.params);
            };
        }
        else if(rpc.hasOwnProperty('result')) {
        }
        else if(rpc.hasOwnProperty('error')) {
        };
        
        return false;
    };
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
    this.onError = function(eventObject) {
        SockLib.setText('Error: ' + eventObject.type);
        
        return false;
    };
    this.onOpen = function() {
        this.setText('!Connected to socket!');
        return false;
    };
};
SockLib.__construct();