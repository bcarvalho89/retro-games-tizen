export function request(method, url, body) {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.responseType = 'arraybuffer';
    xhr.timeout = 60000;
    xhr.onload = () => resolve({ status: xhr.status, data: xhr.response });
    xhr.onerror = xhr.ontimeout = () => resolve({ status: 0, data: null });
    xhr.send(body || null);
  });
}

export function getJson(url) {
  return request('GET', url).then(res => {
    if (res.status !== 200) throw new Error('http ' + res.status);
    return JSON.parse(new TextDecoder().decode(res.data));
  });
}
