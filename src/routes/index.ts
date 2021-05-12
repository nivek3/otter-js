import { Request, Response, NextFunction } from 'express';
import express from 'express';
import cors from 'cors';
import { CacheMiddleware, CacheTimes } from './middleware';

const app = express();
const bodyParser = require('body-parser');
app.use(
  bodyParser.json({
    limit: 100000000
  })
);
app.use(
  bodyParser.raw({
    limit: 100000000
  })
);

function bootstrap(path?: string) {
  const fs = require('fs');
  const router = express.Router({
    mergeParams: true
  });
  const folder = path ? path + '/' : '';
  fs.readdirSync(__dirname + '/' + path).forEach(function(file: string) {
    if (file.match(/\.js$/) !== null && file !== 'index.js') {
      var route = require('./' + folder + file);
      router.use(route.path, route.router);
    }
  });

  return router;
}

// function getRouterFromFile(path) {
//   const router = express.Router({
//     mergeParams: true
//   });

//   var route = require('./' + path);
//   router.use(route.path, route.router);
//   return router;
// }

app.use(cors());
// app.use(LogMiddleware());
app.use(CacheMiddleware(CacheTimes.Second, CacheTimes.Second));
// app.use('/api', getRouterFromFile('status'));

app.use('/api/:chain/:network', (req: Request, resp: Response, next: NextFunction) => {
  let { payload, network } = req.body;
  const hasPayload = payload != null;
  const hasNetwork = network != null;
  if (!hasPayload || !hasNetwork) {
    return resp.status(500).send(`This node is not configured`);
  }
  return next();
});

app.use('/api', bootstrap('api'));

// catch 404 and forward to error handler
app.use(function (_, res) {
  return res.sendStatus(404);
});

// error handler
app.use(function (err, req, res, _) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.errzor = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.statusCode || 500);
  res.send({
    code: err.code || err.statusCode || 500,
    message: err.message || err
  });
});

export default app;