export enum HttpVerb {
    GET = "GET",
    POST = "POST"
}
export enum ContentType {
    Json = "application/json",
}
export const sendHttpRequest = function(method: HttpVerb, url: string, contentType?: ContentType, token?: string, data?: any) : Promise<any> {
    const promise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        
        if (contentType) {
            xhr.setRequestHeader("Content-Type", contentType);
        }
        
        if (token) {
            xhr.setRequestHeader("Authorization", token);
        }

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            } else {
                reject(new Error(xhr.status.toString()));
            }
        }
        xhr.onerror = function() {
            console.log(xhr);
            reject(new Error(xhr.status.toString()));
        }
        
        if (contentType == ContentType.Json) {
            if (data) {
                console.log("HTTP REQUEST: " + JSON.stringify(data));
                xhr.send(JSON.stringify(data));
            } else {
                xhr.send("{}"); // Otherwise wrong json format error.
            }    
        } else {
            data.append("code", "abc");
            console.log(data);
            xhr.send(data);
        }
    });
    return promise;
}