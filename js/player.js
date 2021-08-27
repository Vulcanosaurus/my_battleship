/*jslint browser this */
/*global _, shipFactory, player, utils */

(function (global) {
  "use strict";

  var sheep = { dom: { parentNode: { removeChild: function () {} } } };

  var player = {
    grid: [],
    tries: [],
    fleet: [],
    game: null,
    activeShip: 0,
    relativePosition: 0,
    init: function () {
      // créé la flotte
      this.fleet.push(shipFactory.build(shipFactory.TYPE_BATTLESHIP));
      this.fleet.push(shipFactory.build(shipFactory.TYPE_DESTROYER));
      this.fleet.push(shipFactory.build(shipFactory.TYPE_SUBMARINE));
      this.fleet.push(shipFactory.build(shipFactory.TYPE_SMALL_SHIP));

      // créé les grilles
      this.grid = utils.createGrid(10, 10);
      this.tries = utils.createGrid(10, 10);
    },
    play: function (col, line) {
      // appel la fonction fire du game, et lui passe une calback pour récupérer le résultat du tir
      this.game.fire(
        this,
        col,
        line,
        _.bind(function (hasSucceed) {
          this.tries[line][col] = hasSucceed;
        }, this)
      );
    },
    displayAttack: function (col, line, touche) {
      var dom = document.createElement("div");
      dom.style.position = "absolute";
      dom.style.left = utils.CELL_SIZE * col + "px";
      dom.style.top = utils.CELL_SIZE * line + "px";
      dom.style.height = utils.CELL_SIZE + "px";
      dom.style.width = utils.CELL_SIZE + "px";
      dom.style.zIndex = -1;
      dom.style.backgroundColor = "gray";
      if (touche) {
        dom.style.backgroundColor = "red";
      }
      document.querySelector(".main-grid").appendChild(dom);
    },
    // quand il est attaqué le joueur doit dire si il a un bateaux ou non à l'emplacement choisi par l'adversaire
    receiveAttack: function (from, col, line, callback) {
      var succeed = false;
      if (this.grid[line][col] !== 0) {
        succeed = true;
        var shipId = this.fleet[(this.grid[line][col] - 1) % 4];
        shipId.life -= 1;
        if (
          shipId.life === 0 &&
          this.game.currentPhase == "PHASE_PLAY_OPPONENT"
        ) {
          document
            .querySelector("." + shipId.name.toLowerCase())
            .classList.add("sunk");
        }
        this.grid[line][col] = 0;
      }
      // if (
      //   this.game.currentPhase === "PHASE_PLAY_PLAYER" &&
      //   from.tries[line][col] === 0
      // ) {
      //   this.displayAttack(col, line, succeed);
      // }
      callback.call(undefined, succeed);
    },
    setActiveShipPosition: function (x, y) {
      var ship = this.fleet[this.activeShip];
      //Calcule la position relative du vaisseau en function des vaisseaux antecedents et de leurs directions
      switch (ship.direction) {
        case "horizontal":
          var xMin, xMax;
          xMin = x - Math.floor(ship.getLife() / 2);
          x % 2 === 0
            ? (xMax = x + Math.floor(ship.getLife() / 2) - 1)
            : (xMax = x + Math.floor(ship.getLife() / 2));
          var i = 0;
          //verifie si la position max / min du vaisseau ne depasse pas le grid
          if (xMax > this.grid[y].length || xMin < 0) {
            return false;
          }
          //Verifie auparavant si les cases qu'on veut remplir sont vides
          while (i < ship.getLife()) {
            if (this.grid[y][xMin + i] !== 0) {
              return false;
            }
            i += 1;
          }
          i = 0;
          //rajoute depuis la position minimale l'id du vaisseau dans le grid
          while (i < ship.getLife()) {
            this.grid[y][xMin + i] = ship.getId();
            i += 1;
          }
          this.relativePosition = this.relativePosition + utils.CELL_SIZE;
          break;
        case "vertical":
          var yMin, yMax;
          var i = 0;
          yMin = y - Math.floor(ship.getLife() / 2);
          y % 2 === 0
            ? (yMax = y + Math.floor(ship.getLife() / 2) - 1)
            : (yMax = y + Math.floor(ship.getLife() / 2));
          //verifie si la position max / min du vaisseau ne depasse pas le grid
          if (
            yMax > this.grid.length ||
            yMin < 0 ||
            typeof yMin === "undefined"
          ) {
            return false;
          }
          //Verifie auparavant si les cases qu'on veut remplir sont vides
          while (i < ship.getLife()) {
            if (
              typeof this.grid[yMin + i] === "undefined" ||
              this.grid[yMin + i][x] !== 0
            ) {
              return false;
            }
            i += 1;
          }
          i = 0;
          while (i < ship.getLife()) {
            this.grid[yMin + i][x] = ship.getId();
            i += 1;
          }
          this.relativePosition =
            this.relativePosition + ship.getLife() * utils.CELL_SIZE;
          break;

        default:
          console.error("Direction invalide...");
          break;
      }
      i = 0;
      return true;
    },
    clearPreview: function () {
      var fleetLength = this.game.grid.querySelectorAll(":not(.row, .cell)")
        .length;
      for (let i = 0; i < fleetLength; i++) {
        this.game.grid.querySelectorAll(":not(.row, .cell)")[0].remove();
      }
    },
    resetShipPlacement: function () {
      this.clearPreview();

      this.activeShip = 0;
      this.grid = utils.createGrid(10, 10);
    },
    activateNextShip: function () {
      if (this.activeShip < this.fleet.length - 1) {
        this.activeShip += 1;
        return true;
      } else {
        return false;
      }
    },
    renderTries: function (grid) {
      var self = this;
      this.tries.forEach(function (row, rid) {
        row.forEach(function (val, col) {
          var node = grid.querySelector(
            ".row:nth-child(" +
              (rid + 1) +
              ") .cell:nth-child(" +
              (col + 1) +
              ")"
          );
          switch (self.game.currentPhase) {
            case "PHASE_PLAY_PLAYER":
              if (val === true) {
                node.style.backgroundColor = "red";
              } else if (val === false) {
                node.style.backgroundColor = "#aeaeae";
              }
              break;

            case "PHASE_PLAY_OPPONENT":
              if (val === true) {
                node.style.backgroundColor = "red";
              }
              break;

            default:
              break;
          }
        });
      });
    },
    //
    //REWORK BEGINS HERE
    //
    setGame: function (gameObject) {
      this.game = gameObject;
    },
    renderShips: function (grid) {},
  };

  global.player = player;
})(this);
