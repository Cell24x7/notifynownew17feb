const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('cd notifynow && chmod +x deploy_new_server_update.sh && ./deploy_new_server_update.sh', (err, stream) => {
    if (err) {
      console.log('Error executing command:');
      console.log(err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '64.227.183.240',
  port: 22,
  username: 'veloxadmin',
  password: '0dgoldimagecf38532',
  readyTimeout: 99999
});
