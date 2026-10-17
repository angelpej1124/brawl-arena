// 아주 작은 WebSocket 서버 구현 (외부 라이브러리 없이 Node.js 기본 기능만 사용)
// 게임 로직과는 상관없는 "통신 배관" 부분이라 수정할 일이 거의 없어요.
const crypto = require('crypto');
const { EventEmitter } = require('events');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PAYLOAD = 64 * 1024;

class Socket extends EventEmitter {
  constructor(sock) {
    super();
    this.sock = sock;
    this.buf = Buffer.alloc(0);
    this.open = true;
    sock.setNoDelay(true);
    sock.on('data', (d) => this._onData(d));
    sock.on('close', () => this._close());
    sock.on('error', () => this._close());
  }

  _onData(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    while (this.buf.length >= 2) {
      const b0 = this.buf[0], b1 = this.buf[1];
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) {
        if (this.buf.length < 4) return;
        len = this.buf.readUInt16BE(2); off = 4;
      } else if (len === 127) {
        if (this.buf.length < 10) return;
        len = Number(this.buf.readBigUInt64BE(2)); off = 10;
      }
      if (len > MAX_PAYLOAD) return this.close();
      const maskOff = off;
      if (masked) off += 4;
      if (this.buf.length < off + len) return;
      const payload = Buffer.from(this.buf.subarray(off, off + len));
      if (masked) {
        for (let i = 0; i < len; i++) payload[i] ^= this.buf[maskOff + (i & 3)];
      }
      this.buf = this.buf.subarray(off + len);

      if (opcode === 0x1) this.emit('message', payload.toString('utf8'));
      else if (opcode === 0x8) return this.close();
      else if (opcode === 0x9) this._frame(0xa, payload);
    }
  }

  _frame(opcode, payload) {
    if (!this.open) return;
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.from([0x80 | opcode, len]);
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode; header[1] = 126; header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2);
    }
    this.sock.write(Buffer.concat([header, payload]));
  }

  send(text) {
    this._frame(0x1, Buffer.from(text, 'utf8'));
  }

  close() {
    if (!this.open) return;
    try { this._frame(0x8, Buffer.alloc(0)); } catch (e) {}
    this.sock.end();
    this._close();
  }

  _close() {
    if (!this.open) return;
    this.open = false;
    this.sock.destroy();
    this.emit('close');
  }
}

// http 서버의 'upgrade' 이벤트에 연결해서 사용
function handleUpgrade(req, sock, onConnect) {
  const key = req.headers['sec-websocket-key'];
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') {
    sock.destroy();
    return;
  }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  sock.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  onConnect(new Socket(sock), req);
}

module.exports = { handleUpgrade };
