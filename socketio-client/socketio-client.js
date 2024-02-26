module.exports = function(RED) {
  'use strict';

  var io = require('socket.io-client');
  var sockets = {};

  /* sckt config */
    function SocketIOConfig(n) {
      RED.nodes.createNode(this, n);
      this.host = n.host;
      this.port = n.port;
      this.path = n.path;
    }
    RED.nodes.registerType('socketio-config', SocketIOConfig);

  /* sckt connector*/
    function SocketIOConnector(n){
      RED.nodes.createNode(this, n);
      this.server = RED.nodes.getNode(n.server);
      this.server.namespace = n.namespace;
      this.name = n.name;
      var node = this;
      // console.log(node)

      
      if(sockets[node.id]){ delete sockets[node.id];}
      sockets[node.id] = connect(this.server);
      // console.log(sockets[node.id])
      sockets[node.id].on('connect', function(){
        // console.log({socketId:node.id})
        node.send({ payload:{socketId:node.id, status:'connected'} });
        node.status({fill:"green",shape:"dot", text:"connected"});
      });

      sockets[node.id].on('disconnect', function(){
        node.send({payload:{socketId:node.id, status:'disconnected'}});
        node.status({fill:'red',shape:'ring', text:'disconnected'});
      });

      sockets[node.id].on('connect_error', function(err) {
        if (err) {
          node.status({fill:'red',shape:'ring',text:'disconnected'});
          node.send({payload:{socketId:node.id, status:'disconnected'}});
          //node.error(err);
        }
      }); 

      this.on('close', function(done) {
        sockets[node.id].disconnect();
        node.status({});
        done();
      }); 
    }
    RED.nodes.registerType('socketio-connector', SocketIOConnector);

  /* sckt listener*/
    function SocketIOListener(n){
      RED.nodes.createNode(this, n);
      this.name = n.name;
      this.eventName = n.eventname;
      this.socketId = null;

      var node = this;
      

      node.on('input', function(msg){
        node.socketId = msg.payload.socketId;
        if(!msg.payload.eventname){
          node.eventName = n.eventname;
        }else{node.eventName = msg.payload.eventname;}
        
        if(msg.payload.status == 'connected'){
          node.status({fill:'green',shape:'dot',text:'listening'});
            sockets[node.socketId].on(node.eventName, function(data){
              node.send( {payload:data} );
            });
        }else{
          node.status({fill:'red',shape:'ring',text:'disconnected'});
        }
      });

      node.on('close', function(done) {
        sockets[node.id].disconnect();
        node.status({});
        done();
      }); 
        
    }
    RED.nodes.registerType('socketio-listener', SocketIOListener);

  /* sckt emitter*/
    function SocketIOEmitter(n){
      RED.nodes.createNode(this, n);
      this.name = n.name;
      this.message = n.message;
     /*    this.eventName = n.eventname;*/
      this.socketId = null;

      var node = this;

      node.on('input', function(msg){
        node.socketId = msg.payload.socketId;
        if(msg.payload.status == 'connected'){
          if(msg.payload.eventName != null){
            node.status({fill:'green',shape:'dot',text:'emit '+ msg.payload.eventName });
            if(msg.payload.message){
              sockets[node.socketId].emit(msg.payload.eventName, msg.payload.message );
            }else{
              sockets[node.socketId].emit(msg.payload.eventName);
            }
          }else if(msg.payload.eventName == null){
            node.status({fill:'green',shape:'dot',text:'emit '+ node.name });
            if (node.message){
              sockets[node.socketId].emit(node.name, node.message );
            }else{
              sockets[node.socketId].emit(node.name);
            }
          }else {
            node.status({fill:'red',shape:'ring',text:'not send'});    
          }
        }else{
          node.status({fill:'red',shape:'ring',text:'disconnected'});
        }
      });
    }
    RED.nodes.registerType('socketio-emitter', SocketIOEmitter);

  function connect(config, force) {
    var uri = config.host;
    var sckt;
    var options = {};
    options.transports = ["websocket", "polling"];
    options.upgrade = true;
    options.forceBase64 = false;
    options.reconnection = true;


    if(config.port != ''){
      uri += ':' +  config.port;
    }
    if(config.path != ''){
      options.path = config.path;
    }
    if(config.namespace){
      uri += '/' +  config.namespace;
      const socket = io( uri, options );
      sckt = socket.connect();
    }else{
      const socket = io( uri, options );
      sckt = socket.connect();
    }
    return sckt;
  }

  function disconnect(config) {
  }
}
