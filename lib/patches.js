/* --------------------
 * sequelize-values Sequelize plugin
 * Patched versions of sequelize methods which unify interface across Sequlize versions 2.x.x, 3.x.x and 4.x.x
 * ------------------*/

// Modules
var semverSelect = require('semver-select');

var sequelizeVersionImported = require('sequelize/package.json').version;

// Exports

/**
 * Define universal interface across Sequelize v2, v3 and v4 to work around API changes between versions.
 * @param {Function} Sequelize - Sequelize constructor to base patches on
 */
module.exports = function(Sequelize) {
    // Get Sequelize version
    // NB This is not reliable where an old version of Sequelize
    // which does not have a `version` attribute is provided.
    var sequelizeVersion = Sequelize.version || sequelizeVersionImported;

    // Define patches based on Sequelize version
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
