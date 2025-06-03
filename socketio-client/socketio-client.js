module.exports = function(RED) {
  'use strict';

  var io = require('socket.io-client');
  var sockets = {};
  var current_socket = [];

  /* sckt config */
    function SocketIOConfig(n) {
      RED.nodes.createNode(this, n);
      this.name = n.name
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
      // console.log(this.server)
      this.name = n.node_name;
      var node = this;
      // console.log(node)

      node.on('input', function(msg){  
        console.log("=======CONNECTION=====")
        //handel last connection and disconnect
        if(sockets[node.id]){ 
          sockets[node.id].disconnect();
          // delete sockets[node.id];
          // current_socket = []
          current_socket = current_socket.filter(function(item){
            return item.id !== node.id 
          })
        }
        sockets[node.id] = connect(this.server);

        // console.log(sockets[node.id])
        sockets[node.id].on('connect', function(){
          // console.log("node : ",node)       
          current_socket.push({"name":node.server.name,"id":node.id,"socid":node.server.id});
          console.log("Connection : ",current_socket)
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
         
        
      });

      this.on('close', function(done) {
        sockets[node.id].disconnect();
        node.status({});
        done();
      }); 
    }
    RED.nodes.registerType('socketio-connector', SocketIOConnector);

  /* sckt connector*/
  function SocketIODisconnect(n){
    RED.nodes.createNode(this, n);
    this.server = RED.nodes.getNode(n.server);
    // this.server.namespace = n.namespace;
    // console.log(this.server)
    // this.name = n.node_name;
    var node = this;
    // console.log(node)

    node.on('input', function(msg){  
      console.log("=======DISCONNECT======")
      console.log(this.server)
      var sv_socid = this.server.id;
      current_socket.forEach(element => {
        if(this.server.id == element["socid"] ){
          console.log("dis element",element["socid"])
          this.disconid = element["id"]
          sockets[this.disconid].disconnect();
        }
      });
      

      current_socket = current_socket.filter(function(item){
        return item.socid !== sv_socid 
      })
      console.log(current_socket);
    });

    this.on('close', function(done) {
      sockets[node.id].disconnect();
      node.status({});
      done();
    }); 
  }
  RED.nodes.registerType('socketio-disconnect', SocketIODisconnect);  


  /* sckt listener*/
    function SocketIOListener(n){
      RED.nodes.createNode(this, n);
      this.name = n.name;
      this.eventName = n.eventname;
      this.socketId = null;

      var node = this;
      

      node.on('input', function(msg){
        // console.log(node)
        // console.log(msg.payload)
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
      this.server = RED.nodes.getNode(n.server);
      this.name = n.name;
      this.message = n.message;
      // this.server = n.server;
     /*    this.eventName = n.eventname;*/
      this.socketId = null;

      var node = this;
      
      
      node.on('input', function(msg){
          // console.log(current_socket)
          // console.log("NODE:" ,node)
          console.log("=======EMIT=====")
          console.log("NODE SerVER ID: ", node.server.id)
          console.log("Current Socket:",current_socket)
          current_socket.forEach(element => {
            if(element["socid"]  == node.server.id ){
              console.log("EMIT ELEMENT : ",element)
              // console.log(element.socid)
              this.emitid = element["id"]


              console.log("SEND to: ",this.emitid)
              if(msg.payload.eventName != null){
                // console.log(msg.payload)
                node.status({fill:'green',shape:'dot',text:'emit '+ msg.payload.eventName });
                if(msg.payload.message!= '{}'){
                  sockets[this.emitid].emit(msg.payload.eventName, JSON.parse(msg.payload.message));
                }else{
                  if(msg.payload.msgsocket!= ""){
                    sockets[this.emitid].emit(msg.payload.eventName, msg.payload.msgsocket);
                  }
                  else{
                  sockets[this.emitid].emit(msg.payload.eventName);
                  }
                }
              }else if(msg.payload.eventName == null){
                // console.log(msg.payload.msgsocket)
                // console.log(node)
                node.status({fill:'green',shape:'dot',text:'emit '+ node.name });
                if (node.message != '{}'){
                  sockets[this.emitid].emit(node.name, JSON.parse(node.message) );
                }else{
                  if(msg.payload.msgsocket!= ""){
                    sockets[this.emitid].emit(node.name, msg.payload.msgsocket);
                  }
                  else{
                  sockets[this.emitid].emit(node.name);
                  }
                }
              }else {
                node.status({fill:'red',shape:'ring',text:'not send'});    
              }
            }
          });

        
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
    options.reconnection = false;


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
