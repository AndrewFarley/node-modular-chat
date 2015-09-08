/**
 * JSON RPC handling library
 *
 * @author Kristian B
 */
var JsonRpc = function() {
    this.data = {
        /* RPC id counter */
        "jsonId": 0
        /* RPC version */
        , "version": "2.0"
        /* RPC error codes */
        , "errorCodes": {
            "-32700": "Parse error"
            , "-32600": "Invalid Request"
            , "-32601": "Method not found"
            , "-32602": "Invalid parameters"
            , "-32603": "Internal error"
        }
        /* RPC base object */
        , "body": function(parent) {
            parent.data.jsonId += 1;
            return {
                "jsonrpc": parent.data.version
                , "id": parent.data.jsonId
            };
        }
    };
    /**
     * Fetches a new instance of an RPC error
     *
     * @param {string} code - RPC error code
     * @return {Object} rpc - RPC error object
     */
    this.getError =  function(code) {
        var rpc = new this.data.body(this);
        if(this.data.errorCodes.hasOwnProperty(code)) {
            rpc.error = {
                "code": code
                , "message": this.data.errorCodes[code]
                , "data": ""
            };
        };
        return rpc;
    };
    /**
     * Fetches a new instance of an RPC request
     *
     * @return {Object} rpc - RPC request object
     */
    this.getRequest = function() {
        var rpc = new this.data.body(this);
        rpc.params = {};
        rpc.method = '';
        return rpc;
    }
    /**
     * Fetches a new instance of an RPC result
     *
     * @return {Object} rpc - RPC result object
     */
    this.getResult = function() {
        var rpc = new this.data.body(this);
        rpc.result = {};
        return rpc;
    }
    /**
     * Parses an incoming JSON RPC string and checks it for validity
     *
     * @param {string} rpc - Serialized RPC object
     * @return {Object} - RPC object
     */
    this.parse = function(rpc) {
        var jsonRpc = JSON.parse(rpc);
        if(jsonRpc.hasOwnProperty('id') && jsonRpc.hasOwnProperty('jsonrpc')) {
            if(jsonRpc.id > 0 && jsonRpc.jsonrpc === this.data.version) {
                return jsonRpc;
            };
        };
        return this.getError('-32600');
    }
};
/**
 *  Adds the ability to use it with NodeJS
 */
try {
    exports.JsonRpc = JsonRpc;
}
catch(error) {
    // No need to do anything
};