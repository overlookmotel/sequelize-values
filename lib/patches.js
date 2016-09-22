// --------------------
// Sequelize values
// Patched versions of sequelize methods which unify interface across Sequlize versions 2.x.x and 3.x.x
// --------------------

// modules
var semverSelect = require('semver-select');

var sequelizeVersionImported = require('sequelize/package.json').version;

// exports

// function to define patches
module.exports = function(Sequelize) {
    // get Sequelize version
    var sequelizeVersion = Sequelize.version || sequelizeVersionImported;

    // define patches
    return semverSelect.object(sequelizeVersion, {
        instanceOptions: {
            '2.0.0 - 3.8.x': function(instance) {
                return instance.options;
            },
            '>=3.9.0': function(instance) {
                return instance.$options;
            }
        },
        associationForeignKey: {
            '^2.0.0': function(association) {
                return association.identifier;
            },
            '>=3.0.0': function(association) {
                return association.foreignKey;
            }
        },
        associationTargetKey: {
            '^2.0.0': function(association) {
                return association.targetIdentifier;
            },
            '>=3.0.0': function(association) {
                return association.targetKey;
            }
        }
    });
};
