var WebSock = new function() {
    var objOutput = document.getElementById('chatMessageDisplay');
    var objUserCount = document.getElementById('userCount');
    var objInputField = document.getElementById('inputField');
    
    var objButtons = document.getElementById('buttonContainer');
    objButtons.removeAttribute('id');
    
    this.objOptions = {
        "intMessageCounter": 0
        , "intIdCounter": 0
        , "parameters": {}
        , "audioTags": {}
    };
    this.objError = {
        "code": ""
        , "message": ""
        , "data": ""
    };
    this.objWebsocket = {};
    
    /*
        Creates websocket connection, as well as any automated functionality.
    */
    this.__constructor = function() {
        // Loads get parameters into object
        var strParameters = window.location.search.substr(1);
        var arrParameters = strParameters.split('&');
        for(var i = 0; i < arrParameters.length; i += 1) {
            var arrTemp = arrParameters[i].split('=');
            this.objOptions.parameters[arrTemp[0]] = arrTemp[1];
        };
        
        // Sets default name, in case no get parameter with name was given
        if(!this.objOptions.parameters.hasOwnProperty('name')) {
            this.objOptions.parameters.name = 'McElroy';
        };
        
        // Sets default port, in case no get parameter with port was given
        if(!this.objOptions.parameters.hasOwnProperty('port')) {
            this.objOptions.parameters.port = '8080';
        };
        
        // Finds all audio tags and arranges them in an object list for use later
        var arrAudioList = document.getElementsByTagName('audio');
        for(var i = 0; i < arrAudioList.length; i += 1) {
            var objTemp = arrAudioList[i];
            var strTemp = objTemp.getAttribute('name');
            if(strTemp !== undefined) {
                WebSock.objOptions.audioTags[strTemp] = objTemp;
            };
        };
        
        // Creates websocket connection
        var strWebsocketUri = 'ws://' + document.location.host + ':' + this.objOptions.parameters.port + '/nexus/socket';
        this.objWebsocket = new WebSocket(strWebsocketUri);
        // Defines function names to use on websocket responses
        this.objWebsocket.onerror = function(objEvent) {onError(objEvent);};
        this.objWebsocket.onclose = function(objEvent) {onError(objEvent);};
        this.objWebsocket.onmessage = function(objEvent) {onMessage(objEvent);};
        this.objWebsocket.onopen = function(objEvent) {onOpen(objEvent);};
        
        // Sets an a function to reset messages received when you leave the window
        window.onblur = function() {WebSock.updateWindow(0);};
        
        // Sets a keep alive function that calls it self, to stop the connection from closing
        this.keepItAlive();
        
        // Removes id's from dom elements, once they have been captured
        objOutput.removeAttribute('id');
        objUserCount.removeAttribute('id');
        objInputField.removeAttribute('id');
        
        // Set default volume to 10
        this.setVolume(10);
        
        return false;
    };
    /*
        Checks if enter is hit in the input box and sends it when enter is pressed,
        this is done because it is attached to an event on the input tag.
    */
    this.checkSendText = function(objEvent) {
        objEvent.target = (objEvent.target ? objEvent.target : objEvent.srcElement);
        if(objEvent.keyCode === 13) {
            sendText(objEvent.target.value);
            objEvent.target.value = '';
        };
        return false;
    };
    /*
        Sets all messages to display none.
    */
    this.clearMessages = function() {
        var arrTemp = objOutput.childNodes;
        for(var i = 0; i < arrTemp.length; i += 1) {
            if(typeof arrTemp[i] === 'object') {
                if(arrTemp[i].style.display === 'none') {
                    break;
                };
                arrTemp[i].style.display = 'none';
            };
        };
        return false;
    };
    /*
        Volume adjuster
    */
    this.setVolume = function(volumePercentage) {
        var volume = volumePercentage / 100;
        for(var i in this.objOptions.audioTags) {
            this.objOptions.audioTags[i].volume = volume;
        };
        return false;
    };
    /*
        Detects if autoclear has been set
        and clears all messages and resets the counter.
    */
    this.updateWindow = function(intCounterSet) {
        
        if(typeof intCounterSet === 'number') {
            this.objOptions.intMessageCounter = intCounterSet;
            
            if(this.objOptions.parameters.hasOwnProperty('autoclear')) {
                this.clearMessages();
            };
        }
        else {
            this.objOptions.intMessageCounter += 1;
        };
        
        document.title = this.objOptions.intMessageCounter + ' new';
        
        return false;
    };
    /*
        Plays mp3 notification.
    */
    this.playNotifications = function(strWhatToPlay) {
        this.objOptions.audioTags[strWhatToPlay].currentTime = 0;
        this.objOptions.audioTags[strWhatToPlay].play();
        
        return false;
    };
    /*
        Replays last x messages
    */
    this.replay = function(replayCount) {
        var jsonRpc = getCleanRpcObject('request');
        jsonRpc.method = 'requestReplay';
        jsonRpc.params.replayCount = replayCount;
        WebSock.objWebsocket.send(JSON.stringify(jsonRpc));
        return false;
    };
    /*
        Automatically executes a keep alive to make sure the connection doesn't die.
    */
    this.keepItAlive = function() {
        var objJsonRpc = getCleanRpcObject('request');
        objJsonRpc.method = 'keepAlive';
        try {
            WebSock.objWebsocket.send(JSON.stringify(objJsonRpc));
        }
        catch (objError) {
            
            this.objError.code = "" + objError.code;
            this.objError.message = objError.name;
            this.objError.data = objError.stack;
        };
        
        setTimeout("WebSock.keepItAlive();", 30000);
        
        return false;
    };
    /*
        Sends a nudge to other clients.
    */
    this.sendNudge = function() {
        var objJsonRpc = getCleanRpcObject('request');
        objJsonRpc.method = 'nudge';
        
        WebSock.objWebsocket.send(JSON.stringify(objJsonRpc));
        
        return false;
    };
    /*
        Plays notification when nudges are received.
    */
    this.nudge = function(objEvent, objParams) {
        WebSock.playNotifications('nudge');
        
        return false;
    };
    /*
        Sets the peer count if received and notifies if a user left or joined.
    */
    this.setPeerCount = function(objEvent, objParams) {
        var intTemp = parseInt(objUserCount.innerHTML);
        var strSoundToPlay = 'connected';
        if(intTemp > objParams.peerCount) {
            strSoundToPlay = 'disconnected';
        };
        objUserCount.innerHTML = objParams.peerCount;
        WebSock.playNotifications(strSoundToPlay);
        
        return false;
    };
    /*
        Displays received messages and plays a notification.
    */
    this.postMessage = function(objEvent, objParams) {
        WebSock.updateWindow();
        setText(objParams.name + ': ' + objParams.message);
        WebSock.playNotifications('notify');
        
        return false;
    };
    
    /*
        Cleans JSON RPC 2.0 objects for new use.
    */
    var getCleanRpcObject = function(strObjectType) {
        WebSock.objOptions.intIdCounter += 1;
        var objRpc2 = {"jsonrpc": "2.0", "id": WebSock.objOptions.intIdCounter};
        
        if(strObjectType === 'result') {
            objRpc2.result = {};
        } else if(strObjectType === 'error') {
            objRpc2.error = WebSock.objError;
        } else if(strObjectType === 'request') {
            objRpc2.method = '';
            objRpc2.params = {};
        };
        
        return objRpc2;
    };
    /*
        Receives all messages sent from the server.
    */
    var onMessage = function(objEvent) {
        var objJson = JSON.parse(objEvent.data);
        
        if(objJson.hasOwnProperty('method')) {
            // JSON RPC automatic callback.
            if(WebSock[(objJson.method)] !== undefined) {
                WebSock[(objJson.method)](objEvent, objJson.params);
            };
        }
        else if(objJson.hasOwnProperty('result')) {
            //  Add result logic.
        }
        else if(objJson.hasOwnProperty('error')) {
            //  Add error logic.
        };
        
        return false;
    };
    /*
        Sends a JSON RPC message of type request.
    */
    var sendText = function (strRawText) {
        var objJsonRpc = getCleanRpcObject('request');
        objJsonRpc.method = 'postMessage';
        objJsonRpc.params = {
            "name": WebSock.objOptions.parameters.name
            , "message": strRawText
        };
        
        setText(objJsonRpc.params.name + ': ' + objJsonRpc.params.message);
        
        WebSock.objWebsocket.send(JSON.stringify(objJsonRpc));
        return false;
    };
    /*
        Parses and inserts text on the page.
    */
    var setText = function(strMessage) {
        var objParagraph = document.createElement('p');
        strMessage = strMessage.replace(/\S+(youtube)\S+v=([a-zA-Z0-9_\-]+)\S*/gim, '<iframe style="youtubeFrame" width="320" height="320" src="//www.youtube.com/embed/$2" frameborder="0" allowfullscreen></iframe>');
        strMessage = strMessage.replace(/:(\w+):/gim, '<img class="images" src="$1" />');
        strMessage = strMessage.replace(/\s(http[s]?:\S+)/gim, ' <a href="$1" target="_blank">$1</a>');
        objParagraph.innerHTML = strMessage;
        
        if(objOutput.hasChildNodes()) {
            objOutput.insertBefore(objParagraph, objOutput.childNodes[0]);
        }
        else {
            objOutput.appendChild(objParagraph);
        };
        
        return false;
    };
    /*
        Executes if an error in the socket is received.
    */
    var onError = function(objEvent) {
        objUserCount.innerHTML = 'Error: ' + objEvent.type;
        console.log(objEvent);
        return false;
    };
    /*
        Executes when a socket connection is established.
    */
    var onOpen = function() {
        setText('!Connected to socket!');
        return false;
    };
};
// Initiates the websocket library.
WebSock.__constructor();
