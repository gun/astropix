var http = require('http'),
    url = require("url"),
    path = require("path"),
    fs = require("fs");

var Config = {
    port: 8124,
    search_url: "http://apod.nasa.gov/cgi-bin/apod/apod_search?tquery=",
}

var Scraper = {
    get:    function(url, callback){
        http.get(url, function(res) {
            console.log("opening: "+url);
            console.log("got response: " + res.statusCode);

            var body = "";
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                body += chunk;
            });
            res.on('end', function(){
                callback(body);
            });
  
        }).on('error', function(e) {
            callback("");
        });
    },
    
    search: function(search, callback){
        Scraper.get(Config.search_url+search, function(res) {
            var results=[];
            
            //parse individual results
            //<A HREF=http://apod.nasa.gov/apod/ap041217.html><img alt="Thumbnail image of picture found for this day." src=/apod/calendar/S_041217.jpg></A>
            var reg0=/<a href=.+><img .* src=.+><\/a>/gi
            results=[];
            while(1){
                var match=reg0.exec(res);
                if(match==null)
                    break;
                    
                //extract the link and thumbnail
                //http://apod.nasa.gov/apod/ap080910.html, /apod/calendar/S_041217.jpg
                var reg1=/http:\/\/apod.nasa.gov\/apod\/.+?\.html/i
                var link=reg1.exec(match[0]);
                var reg2=/\/apod\/calendar\/.+?jpg/i
                var img=reg2.exec(match[0]);
                
                if(link!=null && img!=null)
                    results.push({"img":"http://apod.nasa.gov"+img[0], "link":link[0]});
            }
           
            //pick a random one
            
            //open page
            var url=Config.search_url+search;
            Scraper.get(url, function(res) {
                //var results=[];
            
                callback(results);
            });
        });
    }
}

http.createServer(
    function (request, response){
    
        var uri = url.parse(request.url).pathname;
        var filename = path.join(process.cwd(), uri);
          
        //check for AJAX calls
        if(uri=="/search"){
  
            var query = url.parse(request.url, true).query;
            
            Scraper.search(query.search,function(results){
                response.writeHead(200, {"Content-Type": "application/json"});
                response.write(JSON.stringify(results));
                response.end();
            });
           
        //check static files
        }else{
                    
            fs.exists(filename, function(exists){ 
                if(!exists) {
                    response.writeHead(404, {"Content-Type": "text/plain"});
                    response.write("404 Not Found\n");
                    response.end();
                    return;
                }

                if (fs.statSync(filename).isDirectory()) filename += '/index.html';

                fs.readFile(filename, function(err, file) {

                    if(err) {        
                        response.writeHead(500, {"Content-Type": "text/plain"});
                        response.write(err + "\n");
                        response.end();
                        return;
                    }

                    response.writeHead(200, {"Content-Type": "text/html"});
                    response.write(file);
                    response.end();
                });
            });
        }

}).listen(Config.port);

console.log('Server running at http://127.0.0.1:'+Config.port+'/');