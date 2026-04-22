require('dotenv').config();
const chart = require('./routes/chart');
const oracle = require('./routes/oracle');
const payment = require('./routes/payment');
const user = require('./routes/user');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json'
};

function respond(code, body){
  return { statusCode: code, headers: CORS, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.requestContext?.http?.path || event.path || event.rawPath || '/';

  console.log('Method:', method, 'Path:', path);

  if(method === 'OPTIONS') return { statusCode:200, headers:CORS, body:'' };

  try {
    const body = event.body ? JSON.parse(event.body) : {};

    if(path.endsWith('/health')) return respond(200, { status:'ok' });
    if(path.endsWith('/payment/create') && method === 'POST') return respond(200, await payment.createIntent(body));
    if(path.endsWith('/payment/validate-code') && method === 'POST') return respond(200, await payment.validateCode(body));
    if(path.endsWith('/reading/create') && method === 'POST') return respond(200, await chart.createReading(body));
    if(path.endsWith('/oracle/window') && method === 'POST') return respond(200, await oracle.windowReading(body));
    if(path.endsWith('/user/register') && method === 'POST') return respond(200, await user.register(body));

    return respond(404, { error:'Not found', path, method });
  } catch(e){
    console.error('Handler error:', e);
    return respond(500, { error:'Server error', message: e.message });
  }
};
