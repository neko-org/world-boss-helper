const Vec3 = require('tera-vec3');
const request = require('request');
const bosses = require('./bosses.json');
const config = require('./config.json')

let enabled = config.enabled
let alerted = config.alerted
let messager = config.messager
let marker = config.marker

module.exports = function WorldBossHelper(mod) {
  let bossName;
  let playerNamel = "Anonymous";
  let currentChannel;
  let mobIds = [];
  let uid = 999999999n;

  mod.command.add('wbh', {
    $default() {
      mod.command.message('World Boss Helper module. Usage:');
      mod.command.message('  /8 wbh - Turn module on/off');
      mod.command.message('  /8 wbh alert - Turn popup alerts on/off');
      mod.command.message('  /8 wbh msg - Turn system messages on/off');
      mod.command.message('  /8 wbh mark - Turn boss markers on/off');
      mod.command.message('  /8 wbh clear - Attempt to clear markers');
      mod.command.message('  /8 wbh ui - Open ingame WB Timers UI');
    },
    alert() {
      alerted = !alerted;
      mod.command.message(alerted ? 'System popup notice: enabled.' : 'System popup notice: disabled.');
    },
    msg() {
      messager = !messager;
      mod.command.message(messager ? 'System message: enabled.' : 'System message: disabled.');
    },
    mark() {
      marker = !marker;
      mod.command.message(marker ? 'Markers: enabled.' : 'Markers: disabled.');
    },
    clear() {
      mod.command.message('Markers cleared.');
      for (let id of mobIds) {
        despawnItem(id);
      }
    },
    ui() {
      mod.send('S_OPEN_AWESOMIUM_WEB_URL', 1, {
        url: 'teravip.php.xdomain.jp/tera/index.php'
      });
    },
    $none() {
      enabled = !enabled;
      mod.command.message(enabled ? 'Module: enabled.' : 'Module: disabled.');
      if (!enabled) {
        for (let id of mobIds) {
          despawnItem(id);
        }
      }
    }
  })

  mod.game.me.on('change_zone', () => {
    mobIds = [];
  })

  mod.hook('S_CURRENT_CHANNEL', 2, event => {
    currentChannel = event.channel;
  })

  mod.hook('S_SPAWN_NPC', 10, event => {
	if (!enabled) return;
    let boss;
    if (boss = bosses.filter(b => b.huntingZoneId.includes(event.huntingZoneId) && b.templateId === event.templateId)[0]) {
      bossName = boss.name;
      if (marker) {
        spawnItem(event.loc, event.gameId.low);
        mobIds.push(event.gameId.low);
      }
	  request.post('http://teravip.php.xdomain.jp/tera/upload.php', {
        form: {
        serverId: mod.game.me.serverId,
		playerName: event.name,
        bossName: bossName,
		channel: currentChannel,
		time: new Date().getTime(),
            }
          }, function(err, httpResponse, body) {
            if (err) {
              console.error(err);
            } else {
              console.log('[world-boss]');
            }
			});
      if (alerted) {
        notice('Found boss: ' + bossName + '!');
      }
      if (messager) {
        mod.command.message('Found boss: ' + bossName + '!');
      }
    }
  })

  mod.hook('S_DESPAWN_NPC', 3, {order: -100}, event => {
    if (!enabled) return;
    if (mobIds.includes(event.gameId.low)) {
      if (alerted && bossName) {
        if (event.type == 5) {
          request.post('http://teravip.php.xdomain.jp/tera/upload.php', {
            form: {
              serverId: mod.game.me.serverId,
			  playerName: event.name,
              bossName: bossName,
			  channel: currentChannel,
			  time: new Date().getTime(),
            }
          }, function(err, httpResponse, body) {
            if (err) {
              console.error(err);
            } else {
              console.log('[world-boss]');
            }
          });
          if (alerted) {
            notice(bossName + ' is dead!');
          }
          if (messager) {
            mod.command.message('' + bossName + ' is dead!');
          }
        } else if (event.type == 1) {
          if (alerted) {
            notice(bossName + ' is out of range...');
          }
          if (messager) {
            mod.command.message('' + bossName + ' is out of range...');
          }
        }
      }
      bossName = null;
      despawnItem(event.gameId.low);
      mobIds.splice(mobIds.indexOf(event.gameId.low), 1);
    }
  })

  function spawnItem(loc, gameId) {
    mod.send('S_SPAWN_DROPITEM', 6, {
      gameId: uid,
      loc: loc,
      item: 98260,
      amount: 1,
      expiry: 600000,
      owners: [{
        id: 0
      }]
    });
  }

  function despawnItem(gameId) {
    mod.send('S_DESPAWN_DROPITEM', 4, {
      gameId: uid
    });
  }

  function notice(msg) {
    mod.send('S_DUNGEON_EVENT_MESSAGE', 2, {
      type: 42,
      chat: 0,
      channel: 0,
      message: msg
    });
  }

  this.destructor = function() {
    mod.command.remove('wbh');
  }
}
