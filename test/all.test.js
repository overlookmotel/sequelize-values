/* --------------------
 * sequelize-values Sequelize plugin
 * Tests
 * ------------------*/

/* jshint expr: true */
/* global describe, it, beforeEach */

// Modules
var chai = require('chai'),
	expect = chai.expect,
	promised = require('chai-as-promised'),
	Support = require(__dirname + '/support'),
	Sequelize = Support.Sequelize,
	Promise = Sequelize.Promise;

var sequelizeVersion = require('sequelize/package.json').version;

// Init
chai.use(promised);
chai.config.includeStack = true;

// Log Sequelize version
console.log('Sequelize version:', sequelizeVersion);

// Tests
describe(Support.getTestDialectTeaser('Tests'), function () {
	beforeEach(function() {
		// Models
		this.User = this.sequelize.define('User', {name: Sequelize.STRING}, {timestamps: false});
		this.Task = this.sequelize.define('Task', {name: Sequelize.STRING}, {timestamps: false});
		this.Profile = this.sequelize.define('Profile', {name: Sequelize.STRING}, {timestamps: false});
		this.Group = this.sequelize.define('Group', {name: Sequelize.STRING}, {timestamps: false});
		this.Party = this.sequelize.define('Party', {name: Sequelize.STRING}, {timestamps: false});

		// Through models
		this.TaskWorker = this.sequelize.define('TaskWorker', {}, {tableName: 'TasksWorkers', timestamps: false});
		this.TaskSupervisor = this.sequelize.define('TaskSupervisor', {status: Sequelize.STRING}, {tableName: 'TasksSupervisors', timestamps: false});
		this.UserGroup = this.sequelize.define('UserGroup', {}, {tableName: 'UsersGroups', timestamps: false});
		this.UserParty = this.sequelize.define('UserParty', {status: Sequelize.STRING}, {tableName: 'UsersParties', timestamps: false});
		this.UserLike = this.sequelize.define('UserLike', {}, {tableName: 'UsersLikes', timestamps: false});
		this.UserHate = this.sequelize.define('UserHate', {status: Sequelize.STRING}, {tableName: 'UsersHates', timestamps: false});

		// One-to-one relationships
		this.Profile.belongsTo(this.User);
		this.User.hasOne(this.Profile);

		this.Profile.belongsTo(this.User, {as: 'AltUser'});
		this.User.hasOne(this.Profile, {as: 'AltProfile', foreignKey: 'AltUserId'});

		// One-to-many relationships
		this.Task.belongsTo(this.User);
		this.User.hasMany(this.Task);

		this.Task.belongsTo(this.User, {as: 'Owner'});
		this.User.hasMany(this.Task, {as: 'OwnedTasks', foreignKey: 'OwnerId'});

		// Many-to-many relationships
		this.Task.belongsToMany(this.User, {as: 'Workers', through: this.TaskWorker});
		this.User.belongsToMany(this.Task, {as: 'WorkTasks', through: this.TaskWorker});

		this.Task.belongsToMany(this.User, {as: 'Supervisors', through: this.TaskSupervisor});
		this.User.belongsToMany(this.Task, {as: 'SuperviseTasks', through: this.TaskSupervisor});

		this.Group.belongsToMany(this.User, {through: this.UserGroup});
		this.User.belongsToMany(this.Group, {through: this.UserGroup});

		this.Party.belongsToMany(this.User, {through: this.UserParty});
		this.User.belongsToMany(this.Party, {through: this.UserParty});

		// Many-to-many self relationships
		this.User.belongsToMany(this.User, {as: 'Likes', through: this.UserLike, foreignKey: 'UserId'});
		this.User.belongsToMany(this.User, {as: 'Likers', through: this.UserLike, foreignKey: 'LikeId'});

		this.User.belongsToMany(this.User, {as: 'Hates', through: this.UserHate, foreignKey: 'UserId'});
		this.User.belongsToMany(this.User, {as: 'Haters', through: this.UserHate, foreignKey: 'HateId'});

		// Sync database, create records and define associations between them
		return Promise.bind(this).then(function() {
			return this.sequelize.sync({force: true});
		}).then(function() {
			return Promise.all([
				this.User.create({name: 'Bob'}),
				this.User.create({name: 'John'}),
				this.Profile.create({name: 'Profile'}),
				this.Task.create({name: 'Washing'}),
				this.Group.create({name: 'Admin'}),
				this.Party.create({name: 'Wild'})
			]);
		}).spread(function(bob, john, profile, washing, admin, wild) {
			this.bob = bob;
			this.john = john;
			this.profile = profile;
			this.washing = washing;
			this.admin = admin;
			this.wild = wild;

			return Promise.all([
				this.profile.setUser(this.bob),
				this.profile.setAltUser(this.john),
				this.washing.setUser(this.john),
				this.washing.setOwner(this.bob),
				this.washing.addWorker(this.bob),
				this.washing.addSupervisor(this.john, {status: 'OK'}),
				this.admin.addUser(this.bob),
				this.wild.addUser(this.bob, {status: 'OK'}),
				this.bob.addLike(this.john),
				this.john.addHate(this.bob, {status: 'OK'})
			]);
		});
	});

	describe('Sequelize.getValues()', function() {
		describe('handles basic value', function() {
			it('literal', function() {
				var values = Sequelize.getValues(1);

				expect(values).to.equal(1);
			});

			it('null', function() {
				var values = Sequelize.getValues(null);

				expect(values).to.be.null;
			});

			it('undefined', function() {
				var values = Sequelize.getValues();

				expect(values).to.be.undefined;
			});
		});

		describe('handles object', function() {
			it('with no include', function() {
				return Promise.bind(this).then(function() {
					return this.Task.find({where: {name: 'Washing'}});
				}).then(function(item) {
					var values = Sequelize.getValues(item);

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.washing.id,
						name: 'Washing',
						UserId: this.john.id,
						OwnerId: this.bob.id
					});
				});
			});

			describe('with belongsTo include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.Task.find({
							where: {name: 'Washing'},
							include: [{model: this.User}]
						});
					}).then(function(item) {
						var values = Sequelize.getValues(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.washing.id,
							name: 'Washing',
							UserId: this.john.id,
							OwnerId: this.bob.id,
							User: {
								id: this.john.id,
								name: 'John'
							}
						});
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.Task.find({
							where: {name: 'Washing'},
							include: [{model: this.User, as: 'Owner'}]
						});
					}).then(function(item) {
						var values = Sequelize.getValues(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.washing.id,
							name: 'Washing',
							UserId: this.john.id,
							OwnerId: this.bob.id,
							Owner: {
								id: this.bob.id,
								name: 'Bob'
							}
						});
					});
				});
			});

			describe('with hasOne include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'Bob'},
							include: [{model: this.Profile}]
						});
					}).then(function(item) {
						var values = Sequelize.getValues(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.bob.id,
							name: 'Bob',
							Profile: {
								id: this.profile.id,
								name: 'Profile',
								UserId: this.bob.id,
								AltUserId: this.john.id
							}
						});
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'John'},
							include: [{model: this.Profile, as: 'AltProfile'}]
						});
					}).then(function(item) {
						var values = Sequelize.getValues(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.john.id,
							name: 'John',
							AltProfile: {
								id: this.profile.id,
								name: 'Profile',
								UserId: this.bob.id,
								AltUserId: this.john.id
							}
						});
					});
				});
			});

			describe('with hasMany include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'John'},
							include: [{model: this.Task}]
						});
					}).then(function(item) {
						var values = Sequelize.getValues(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.john.id,
							name: 'John',
							Tasks: [{
								id: this.washing.id,
								name: 'Washing',
								UserId: this.john.id,
								OwnerId: this.bob.id
							}]
						});
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'Bob'},
							include: [{model: this.Task, as: 'OwnedTasks'}]
						});
					}).then(function(item) {
						var values = Sequelize.getValues(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.bob.id,
							name: 'Bob',
							OwnedTasks: [{
								id: this.washing.id,
								name: 'Washing',
								UserId: this.john.id,
								OwnerId: this.bob.id
							}]
						});
					});
				});
			});

			describe('with belongsToMany include', function() {
				describe('other join', function() {
					describe('with no as', function() {
						it('with no through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.find({
									where: {name: 'Bob'},
									include: [{model: this.Group}]
								});
							}).then(function(item) {
								var values = Sequelize.getValues(item);

								expectPlain(values);

								expect(values).to.deep.equal({
									id: this.bob.id,
									name: 'Bob',
									Groups: [{
										id: this.admin.id,
										name: 'Admin',
										UserGroup: {
											UserId: this.bob.id,
											GroupId: this.admin.id
										}
									}]
								});
							});
						});

						it('with through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.find({
									where: {name: 'Bob'},
									include: [{model: this.Party}]
								});
							}).then(function(item) {
								var values = Sequelize.getValues(item);

								expectPlain(values);

								expect(values).to.deep.equal({
									id: this.bob.id,
									name: 'Bob',
									Parties: [{
										id: this.wild.id,
										name: 'Wild',
										UserParty: {
											UserId: this.bob.id,
											PartyId: this.wild.id,
											status: 'OK'
										}
									}]
								});
							});
						});
					});

					describe('with as', function() {
						it('with no through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.find({
									where: {name: 'Bob'},
									include: [{model: this.Task, as: 'WorkTasks'}]
								});
							}).then(function(item) {
								var values = Sequelize.getValues(item);

								expectPlain(values);

								expect(values).to.deep.equal({
									id: this.bob.id,
									name: 'Bob',
									WorkTasks: [{
										id: this.washing.id,
										name: 'Washing',
										UserId: this.john.id,
										OwnerId: this.bob.id,
										TaskWorker: {
											TaskId: this.washing.id,
											UserId: this.bob.id
										}
									}]
								});
							});
						});

						it('with through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.find({
									where: {name: 'John'},
									include: [{model: this.Task, as: 'SuperviseTasks'}]
								});
							}).then(function(item) {
								var values = Sequelize.getValues(item);

								expectPlain(values);

								expect(values).to.deep.equal({
									id: this.john.id,
									name: 'John',
									SuperviseTasks: [{
										id: this.washing.id,
										name: 'Washing',
										UserId: this.john.id,
										OwnerId: this.bob.id,
										TaskSupervisor: {
											TaskId: this.washing.id,
											UserId: this.john.id,
											status: 'OK'
										}
									}]
								});
							});
						});
					});
				});

				describe('self join', function() {
					it('with no through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'Bob'},
								include: [{model: this.User, as: 'Likes'}]
							});
						}).then(function(item) {
							var values = Sequelize.getValues(item);

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.bob.id,
								name: 'Bob',
								Likes: [{
									id: this.john.id,
									name: 'John',
									UserLike: {
										UserId: this.bob.id,
										LikeId: this.john.id
									}
								}]
							});
						});
					});

					it('with through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'John'},
								include: [{model: this.User, as: 'Hates'}]
							});
						}).then(function(item) {
							var values = Sequelize.getValues(item);

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.john.id,
								name: 'John',
								Hates: [{
									id: this.bob.id,
									name: 'Bob',
									UserHate: {
										UserId: this.john.id,
										HateId: this.bob.id,
										status: 'OK'
									}
								}]
							});
						});
					});
				});
			});
		});

		describe('handles array', function() {
			it('with no include', function() {
				return Promise.bind(this).then(function() {
					return this.Task.findAll({where: {name: 'Washing'}});
				}).then(function(items) {
					var values = Sequelize.getValues(items);

					expectPlain(values);

					expect(values).to.deep.equal([{
						id: this.washing.id,
						name: 'Washing',
						UserId: this.john.id,
						OwnerId: this.bob.id
					}]);
				});
			});

			describe('with belongsTo include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.Task.findAll({
							where: {name: 'Washing'},
							include: [{model: this.User}]
						});
					}).then(function(items) {
						var values = Sequelize.getValues(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.washing.id,
							name: 'Washing',
							UserId: this.john.id,
							OwnerId: this.bob.id,
							User: {
								id: this.john.id,
								name: 'John'
							}
						}]);
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.Task.findAll({
							where: {name: 'Washing'},
							include: [{model: this.User, as: 'Owner'}]
						});
					}).then(function(items) {
						var values = Sequelize.getValues(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.washing.id,
							name: 'Washing',
							UserId: this.john.id,
							OwnerId: this.bob.id,
							Owner: {
								id: this.bob.id,
								name: 'Bob'
							}
						}]);
					});
				});
			});

			describe('with hasOne include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.User.findAll({
							where: {name: 'Bob'},
							include: [{model: this.Profile}]
						});
					}).then(function(items) {
						var values = Sequelize.getValues(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.bob.id,
							name: 'Bob',
							Profile: {
								id: this.profile.id,
								name: 'Profile',
								UserId: this.bob.id,
								AltUserId: this.john.id
							}
						}]);
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.User.findAll({
							where: {name: 'John'},
							include: [{model: this.Profile, as: 'AltProfile'}]
						});
					}).then(function(items) {
						var values = Sequelize.getValues(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.john.id,
							name: 'John',
							AltProfile: {
								id: this.profile.id,
								name: 'Profile',
								UserId: this.bob.id,
								AltUserId: this.john.id
							}
						}]);
					});
				});
			});

			describe('with hasMany include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.User.findAll({
							where: {name: 'John'},
							include: [{model: this.Task}]
						});
					}).then(function(items) {
						var values = Sequelize.getValues(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.john.id,
							name: 'John',
							Tasks: [{
								id: this.washing.id,
								name: 'Washing',
								UserId: this.john.id,
								OwnerId: this.bob.id
							}]
						}]);
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.User.findAll({
							where: {name: 'Bob'},
							include: [{model: this.Task, as: 'OwnedTasks'}]
						});
					}).then(function(items) {
						var values = Sequelize.getValues(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.bob.id,
							name: 'Bob',
							OwnedTasks: [{
								id: this.washing.id,
								name: 'Washing',
								UserId: this.john.id,
								OwnerId: this.bob.id
							}]
						}]);
					});
				});
			});

			describe('with belongsToMany include', function() {
				describe('other join', function() {
					describe('with no as', function() {
						it('with no through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.findAll({
									where: {name: 'Bob'},
									include: [{model: this.Group}]
								});
							}).then(function(items) {
								var values = Sequelize.getValues(items);

								expectPlain(values);

								expect(values).to.deep.equal([{
									id: this.bob.id,
									name: 'Bob',
									Groups: [{
										id: this.admin.id,
										name: 'Admin',
										UserGroup: {
											UserId: this.bob.id,
											GroupId: this.admin.id
										}
									}]
								}]);
							});
						});

						it('with through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.findAll({
									where: {name: 'Bob'},
									include: [{model: this.Party}]
								});
							}).then(function(items) {
								var values = Sequelize.getValues(items);

								expectPlain(values);

								expect(values).to.deep.equal([{
									id: this.bob.id,
									name: 'Bob',
									Parties: [{
										id: this.wild.id,
										name: 'Wild',
										UserParty: {
											UserId: this.bob.id,
											PartyId: this.wild.id,
											status: 'OK'
										}
									}]
								}]);
							});
						});
					});

					describe('with as', function() {
						it('with no through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.findAll({
									where: {name: 'Bob'},
									include: [{model: this.Task, as: 'WorkTasks'}]
								});
							}).then(function(items) {
								var values = Sequelize.getValues(items);

								expectPlain(values);

								expect(values).to.deep.equal([{
									id: this.bob.id,
									name: 'Bob',
									WorkTasks: [{
										id: this.washing.id,
										name: 'Washing',
										UserId: this.john.id,
										OwnerId: this.bob.id,
										TaskWorker: {
											TaskId: this.washing.id,
											UserId: this.bob.id
										}
									}]
								}]);
							});
						});

						it('with through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.findAll({
									where: {name: 'John'},
									include: [{model: this.Task, as: 'SuperviseTasks'}]
								});
							}).then(function(items) {
								var values = Sequelize.getValues(items);

								expectPlain(values);

								expect(values).to.deep.equal([{
									id: this.john.id,
									name: 'John',
									SuperviseTasks: [{
										id: this.washing.id,
										name: 'Washing',
										UserId: this.john.id,
										OwnerId: this.bob.id,
										TaskSupervisor: {
											TaskId: this.washing.id,
											UserId: this.john.id,
											status: 'OK'
										}
									}]
								}]);
							});
						});
					});
				});

				describe('self join', function() {
					it('with no through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.findAll({
								where: {name: 'Bob'},
								include: [{model: this.User, as: 'Likes'}]
							});
						}).then(function(items) {
							var values = Sequelize.getValues(items);

							expectPlain(values);

							expect(values).to.deep.equal([{
								id: this.bob.id,
								name: 'Bob',
								Likes: [{
									id: this.john.id,
									name: 'John',
									UserLike: {
										UserId: this.bob.id,
										LikeId: this.john.id
									}
								}]
							}]);
						});
					});

					it('with through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.findAll({
								where: {name: 'John'},
								include: [{model: this.User, as: 'Hates'}]
							});
						}).then(function(items) {
							var values = Sequelize.getValues(items);

							expectPlain(values);

							expect(values).to.deep.equal([{
								id: this.john.id,
								name: 'John',
								Hates: [{
									id: this.bob.id,
									name: 'Bob',
									UserHate: {
										UserId: this.john.id,
										HateId: this.bob.id,
										status: 'OK'
									}
								}]
							}]);
						});
					});
				});
			});
		});
	});

	describe('ModelInstance#getValues()', function() {
		it('with no include', function() {
			return Promise.bind(this).then(function() {
				return this.Task.find({where: {name: 'Washing'}});
			}).then(function(item) {
				var values = item.getValues();

				expectPlain(values);

				expect(values).to.deep.equal({
					id: this.washing.id,
					name: 'Washing',
					UserId: this.john.id,
					OwnerId: this.bob.id
				});
			});
		});

		describe('with belongsTo include', function() {
			it('with no as', function() {
				return Promise.bind(this).then(function() {
					return this.Task.find({
						where: {name: 'Washing'},
						include: [{model: this.User}]
					});
				}).then(function(item) {
					var values = item.getValues();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.washing.id,
						name: 'Washing',
						UserId: this.john.id,
						OwnerId: this.bob.id,
						User: {
							id: this.john.id,
							name: 'John'
						}
					});
				});
			});

			it('with as', function() {
				return Promise.bind(this).then(function() {
					return this.Task.find({
						where: {name: 'Washing'},
						include: [{model: this.User, as: 'Owner'}]
					});
				}).then(function(item) {
					var values = item.getValues();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.washing.id,
						name: 'Washing',
						UserId: this.john.id,
						OwnerId: this.bob.id,
						Owner: {
							id: this.bob.id,
							name: 'Bob'
						}
					});
				});
			});
		});

		describe('with hasOne include', function() {
			it('with no as', function() {
				return Promise.bind(this).then(function() {
					return this.User.find({
						where: {name: 'Bob'},
						include: [{model: this.Profile}]
					});
				}).then(function(item) {
					var values = item.getValues();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.bob.id,
						name: 'Bob',
						Profile: {
							id: this.profile.id,
							name: 'Profile',
							UserId: this.bob.id,
							AltUserId: this.john.id
						}
					});
				});
			});

			it('with as', function() {
				return Promise.bind(this).then(function() {
					return this.User.find({
						where: {name: 'John'},
						include: [{model: this.Profile, as: 'AltProfile'}]
					});
				}).then(function(item) {
					var values = item.getValues();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.john.id,
						name: 'John',
						AltProfile: {
							id: this.profile.id,
							name: 'Profile',
							UserId: this.bob.id,
							AltUserId: this.john.id
						}
					});
				});
			});
		});

		describe('with hasMany include', function() {
			it('with no as', function() {
				return Promise.bind(this).then(function() {
					return this.User.find({
						where: {name: 'John'},
						include: [{model: this.Task}]
					});
				}).then(function(item) {
					var values = item.getValues();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.john.id,
						name: 'John',
						Tasks: [{
							id: this.washing.id,
							name: 'Washing',
							UserId: this.john.id,
							OwnerId: this.bob.id
						}]
					});
				});
			});

			it('with as', function() {
				return Promise.bind(this).then(function() {
					return this.User.find({
						where: {name: 'Bob'},
						include: [{model: this.Task, as: 'OwnedTasks'}]
					});
				}).then(function(item) {
					var values = item.getValues();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.bob.id,
						name: 'Bob',
						OwnedTasks: [{
							id: this.washing.id,
							name: 'Washing',
							UserId: this.john.id,
							OwnerId: this.bob.id
						}]
					});
				});
			});
		});

		describe('with belongsToMany include', function() {
			describe('other join', function() {
				describe('with no as', function() {
					it('with no through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'Bob'},
								include: [{model: this.Group}]
							});
						}).then(function(item) {
							var values = item.getValues();

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.bob.id,
								name: 'Bob',
								Groups: [{
									id: this.admin.id,
									name: 'Admin',
									UserGroup: {
										UserId: this.bob.id,
										GroupId: this.admin.id
									}
								}]
							});
						});
					});

					it('with through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'Bob'},
								include: [{model: this.Party}]
							});
						}).then(function(item) {
							var values = item.getValues();

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.bob.id,
								name: 'Bob',
								Parties: [{
									id: this.wild.id,
									name: 'Wild',
									UserParty: {
										UserId: this.bob.id,
										PartyId: this.wild.id,
										status: 'OK'
									}
								}]
							});
						});
					});
				});

				describe('with as', function() {
					it('with no through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'Bob'},
								include: [{model: this.Task, as: 'WorkTasks'}]
							});
						}).then(function(item) {
							var values = item.getValues();

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.bob.id,
								name: 'Bob',
								WorkTasks: [{
									id: this.washing.id,
									name: 'Washing',
									UserId: this.john.id,
									OwnerId: this.bob.id,
									TaskWorker: {
										TaskId: this.washing.id,
										UserId: this.bob.id
									}
								}]
							});
						});
					});

					it('with through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'John'},
								include: [{model: this.Task, as: 'SuperviseTasks'}]
							});
						}).then(function(item) {
							var values = item.getValues();

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.john.id,
								name: 'John',
								SuperviseTasks: [{
									id: this.washing.id,
									name: 'Washing',
									UserId: this.john.id,
									OwnerId: this.bob.id,
									TaskSupervisor: {
										TaskId: this.washing.id,
										UserId: this.john.id,
										status: 'OK'
									}
								}]
							});
						});
					});
				});
			});

			describe('self join', function() {
				it('with no through fields', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'Bob'},
							include: [{model: this.User, as: 'Likes'}]
						});
					}).then(function(item) {
						var values = item.getValues();

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.bob.id,
							name: 'Bob',
							Likes: [{
								id: this.john.id,
								name: 'John',
								UserLike: {
									UserId: this.bob.id,
									LikeId: this.john.id
								}
							}]
						});
					});
				});

				it('with through fields', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'John'},
							include: [{model: this.User, as: 'Hates'}]
						});
					}).then(function(item) {
						var values = Sequelize.getValues(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.john.id,
							name: 'John',
							Hates: [{
								id: this.bob.id,
								name: 'Bob',
								UserHate: {
									UserId: this.john.id,
									HateId: this.bob.id,
									status: 'OK'
								}
							}]
						});
					});
				});
			});
		});
	});

	describe('Sequelize.getValuesDedup()', function() {
		describe('handles basic value', function() {
			it('literal', function() {
				var values = Sequelize.getValuesDedup(1);

				expect(values).to.equal(1);
			});

			it('null', function() {
				var values = Sequelize.getValuesDedup(null);

				expect(values).to.be.null;
			});

			it('undefined', function() {
				var values = Sequelize.getValuesDedup();

				expect(values).to.be.undefined;
			});
		});

		describe('handles object', function() {
			it('with no include', function() {
				return Promise.bind(this).then(function() {
					return this.Task.find({where: {name: 'Washing'}});
				}).then(function(item) {
					var values = Sequelize.getValuesDedup(item);

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.washing.id,
						name: 'Washing',
						UserId: this.john.id,
						OwnerId: this.bob.id
					});
				});
			});

			describe('with belongsTo include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.Task.find({
							where: {name: 'Washing'},
							include: [{model: this.User}]
						});
					}).then(function(item) {
						var values = Sequelize.getValuesDedup(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.washing.id,
							name: 'Washing',
							OwnerId: this.bob.id,
							User: {
								id: this.john.id,
								name: 'John'
							}
						});
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.Task.find({
							where: {name: 'Washing'},
							include: [{model: this.User, as: 'Owner'}]
						});
					}).then(function(item) {
						var values = Sequelize.getValuesDedup(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.washing.id,
							name: 'Washing',
							UserId: this.john.id,
							Owner: {
								id: this.bob.id,
								name: 'Bob'
							}
						});
					});
				});
			});

			describe('with hasOne include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'Bob'},
							include: [{model: this.Profile}]
						});
					}).then(function(item) {
						var values = Sequelize.getValuesDedup(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.bob.id,
							name: 'Bob',
							Profile: {
								id: this.profile.id,
								name: 'Profile',
								AltUserId: this.john.id
							}
						});
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'John'},
							include: [{model: this.Profile, as: 'AltProfile'}]
						});
					}).then(function(item) {
						var values = Sequelize.getValuesDedup(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.john.id,
							name: 'John',
							AltProfile: {
								id: this.profile.id,
								name: 'Profile',
								UserId: this.bob.id
							}
						});
					});
				});
			});

			describe('with hasMany include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'John'},
							include: [{model: this.Task}]
						});
					}).then(function(item) {
						var values = Sequelize.getValuesDedup(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.john.id,
							name: 'John',
							Tasks: [{
								id: this.washing.id,
								name: 'Washing',
								OwnerId: this.bob.id
							}]
						});
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'Bob'},
							include: [{model: this.Task, as: 'OwnedTasks'}]
						});
					}).then(function(item) {
						var values = Sequelize.getValuesDedup(item);

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.bob.id,
							name: 'Bob',
							OwnedTasks: [{
								id: this.washing.id,
								name: 'Washing',
								UserId: this.john.id
							}]
						});
					});
				});
			});

			describe('with belongsToMany include', function() {
				describe('other join', function() {
					describe('with no as', function() {
						it('with no through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.find({
									where: {name: 'Bob'},
									include: [{model: this.Group}]
								});
							}).then(function(item) {
								var values = Sequelize.getValuesDedup(item);

								expectPlain(values);

								expect(values).to.deep.equal({
									id: this.bob.id,
									name: 'Bob',
									Groups: [{
										id: this.admin.id,
										name: 'Admin'
									}]
								});
							});
						});

						it('with through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.find({
									where: {name: 'Bob'},
									include: [{model: this.Party}]
								});
							}).then(function(item) {
								var values = Sequelize.getValuesDedup(item);

								expectPlain(values);

								expect(values).to.deep.equal({
									id: this.bob.id,
									name: 'Bob',
									Parties: [{
										id: this.wild.id,
										name: 'Wild',
										UserParty: {
											status: 'OK'
										}
									}]
								});
							});
						});
					});

					describe('with as', function() {
						it('with no through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.find({
									where: {name: 'Bob'},
									include: [{model: this.Task, as: 'WorkTasks'}]
								});
							}).then(function(item) {
								var values = Sequelize.getValuesDedup(item);

								expectPlain(values);

								expect(values).to.deep.equal({
									id: this.bob.id,
									name: 'Bob',
									WorkTasks: [{
										id: this.washing.id,
										name: 'Washing',
										UserId: this.john.id,
										OwnerId: this.bob.id
									}]
								});
							});
						});

						it('with through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.find({
									where: {name: 'John'},
									include: [{model: this.Task, as: 'SuperviseTasks'}]
								});
							}).then(function(item) {
								var values = Sequelize.getValuesDedup(item);

								expectPlain(values);

								expect(values).to.deep.equal({
									id: this.john.id,
									name: 'John',
									SuperviseTasks: [{
										id: this.washing.id,
										name: 'Washing',
										UserId: this.john.id,
										OwnerId: this.bob.id,
										TaskSupervisor: {
											status: 'OK'
										}
									}]
								});
							});
						});
					});
				});

				describe('self join', function() {
					it('with no through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'Bob'},
								include: [{model: this.User, as: 'Likes'}]
							});
						}).then(function(item) {
							var values = Sequelize.getValuesDedup(item);

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.bob.id,
								name: 'Bob',
								Likes: [{
									id: this.john.id,
									name: 'John'
								}]
							});
						});
					});

					it('with through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'John'},
								include: [{model: this.User, as: 'Hates'}]
							});
						}).then(function(item) {
							var values = Sequelize.getValuesDedup(item);

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.john.id,
								name: 'John',
								Hates: [{
									id: this.bob.id,
									name: 'Bob',
									UserHate: {
										status: 'OK'
									}
								}]
							});
						});
					});
				});
			});
		});

		describe('handles array', function() {
			it('with no include', function() {
				return Promise.bind(this).then(function() {
					return this.Task.findAll({where: {name: 'Washing'}});
				}).then(function(items) {
					var values = Sequelize.getValuesDedup(items);

					expectPlain(values);

					expect(values).to.deep.equal([{
						id: this.washing.id,
						name: 'Washing',
						UserId: this.john.id,
						OwnerId: this.bob.id
					}]);
				});
			});

			describe('with belongsTo include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.Task.findAll({
							where: {name: 'Washing'},
							include: [{model: this.User}]
						});
					}).then(function(items) {
						var values = Sequelize.getValuesDedup(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.washing.id,
							name: 'Washing',
							OwnerId: this.bob.id,
							User: {
								id: this.john.id,
								name: 'John'
							}
						}]);
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.Task.findAll({
							where: {name: 'Washing'},
							include: [{model: this.User, as: 'Owner'}]
						});
					}).then(function(items) {
						var values = Sequelize.getValuesDedup(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.washing.id,
							name: 'Washing',
							UserId: this.john.id,
							Owner: {
								id: this.bob.id,
								name: 'Bob'
							}
						}]);
					});
				});
			});

			describe('with hasOne include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.User.findAll({
							where: {name: 'Bob'},
							include: [{model: this.Profile}]
						});
					}).then(function(items) {
						var values = Sequelize.getValuesDedup(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.bob.id,
							name: 'Bob',
							Profile: {
								id: this.profile.id,
								name: 'Profile',
								AltUserId: this.john.id
							}
						}]);
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.User.findAll({
							where: {name: 'John'},
							include: [{model: this.Profile, as: 'AltProfile'}]
						});
					}).then(function(items) {
						var values = Sequelize.getValuesDedup(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.john.id,
							name: 'John',
							AltProfile: {
								id: this.profile.id,
								name: 'Profile',
								UserId: this.bob.id
							}
						}]);
					});
				});
			});

			describe('with hasMany include', function() {
				it('with no as', function() {
					return Promise.bind(this).then(function() {
						return this.User.findAll({
							where: {name: 'John'},
							include: [{model: this.Task}]
						});
					}).then(function(items) {
						var values = Sequelize.getValuesDedup(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.john.id,
							name: 'John',
							Tasks: [{
								id: this.washing.id,
								name: 'Washing',
								OwnerId: this.bob.id
							}]
						}]);
					});
				});

				it('with as', function() {
					return Promise.bind(this).then(function() {
						return this.User.findAll({
							where: {name: 'Bob'},
							include: [{model: this.Task, as: 'OwnedTasks'}]
						});
					}).then(function(items) {
						var values = Sequelize.getValuesDedup(items);

						expectPlain(values);

						expect(values).to.deep.equal([{
							id: this.bob.id,
							name: 'Bob',
							OwnedTasks: [{
								id: this.washing.id,
								name: 'Washing',
								UserId: this.john.id
							}]
						}]);
					});
				});
			});

			describe('with belongsToMany include', function() {
				describe('other join', function() {
					describe('with no as', function() {
						it('with no through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.findAll({
									where: {name: 'Bob'},
									include: [{model: this.Group}]
								});
							}).then(function(items) {
								var values = Sequelize.getValuesDedup(items);

								expectPlain(values);

								expect(values).to.deep.equal([{
									id: this.bob.id,
									name: 'Bob',
									Groups: [{
										id: this.admin.id,
										name: 'Admin'
									}]
								}]);
							});
						});

						it('with through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.findAll({
									where: {name: 'Bob'},
									include: [{model: this.Party}]
								});
							}).then(function(items) {
								var values = Sequelize.getValuesDedup(items);

								expectPlain(values);

								expect(values).to.deep.equal([{
									id: this.bob.id,
									name: 'Bob',
									Parties: [{
										id: this.wild.id,
										name: 'Wild',
										UserParty: {
											status: 'OK'
										}
									}]
								}]);
							});
						});
					});

					describe('with as', function() {
						it('with no through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.findAll({
									where: {name: 'Bob'},
									include: [{model: this.Task, as: 'WorkTasks'}]
								});
							}).then(function(items) {
								var values = Sequelize.getValuesDedup(items);

								expectPlain(values);

								expect(values).to.deep.equal([{
									id: this.bob.id,
									name: 'Bob',
									WorkTasks: [{
										id: this.washing.id,
										name: 'Washing',
										UserId: this.john.id,
										OwnerId: this.bob.id
									}]
								}]);
							});
						});

						it('with through fields', function() {
							return Promise.bind(this).then(function() {
								return this.User.findAll({
									where: {name: 'John'},
									include: [{model: this.Task, as: 'SuperviseTasks'}]
								});
							}).then(function(items) {
								var values = Sequelize.getValuesDedup(items);

								expectPlain(values);

								expect(values).to.deep.equal([{
									id: this.john.id,
									name: 'John',
									SuperviseTasks: [{
										id: this.washing.id,
										name: 'Washing',
										UserId: this.john.id,
										OwnerId: this.bob.id,
										TaskSupervisor: {
											status: 'OK'
										}
									}]
								}]);
							});
						});
					});
				});

				describe('self join', function() {
					it('with no through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.findAll({
								where: {name: 'Bob'},
								include: [{model: this.User, as: 'Likes'}]
							});
						}).then(function(items) {
							var values = Sequelize.getValuesDedup(items);

							expectPlain(values);

							expect(values).to.deep.equal([{
								id: this.bob.id,
								name: 'Bob',
								Likes: [{
									id: this.john.id,
									name: 'John'
								}]
							}]);
						});
					});

					it('with through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.findAll({
								where: {name: 'John'},
								include: [{model: this.User, as: 'Hates'}]
							});
						}).then(function(items) {
							var values = Sequelize.getValuesDedup(items);

							expectPlain(values);

							expect(values).to.deep.equal([{
								id: this.john.id,
								name: 'John',
								Hates: [{
									id: this.bob.id,
									name: 'Bob',
									UserHate: {
										status: 'OK'
									}
								}]
							}]);
						});
					});
				});
			});
		});
	});

	describe('ModelInstance#getValuesDedup()', function() {
		it('with no include', function() {
			return Promise.bind(this).then(function() {
				return this.Task.find({where: {name: 'Washing'}});
			}).then(function(item) {
				var values = item.getValuesDedup();

				expectPlain(values);

				expect(values).to.deep.equal({
					id: this.washing.id,
					name: 'Washing',
					UserId: this.john.id,
					OwnerId: this.bob.id
				});
			});
		});

		describe('with belongsTo include', function() {
			it('with no as', function() {
				return Promise.bind(this).then(function() {
					return this.Task.find({
						where: {name: 'Washing'},
						include: [{model: this.User}]
					});
				}).then(function(item) {
					var values = item.getValuesDedup();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.washing.id,
						name: 'Washing',
						OwnerId: this.bob.id,
						User: {
							id: this.john.id,
							name: 'John'
						}
					});
				});
			});

			it('with as', function() {
				return Promise.bind(this).then(function() {
					return this.Task.find({
						where: {name: 'Washing'},
						include: [{model: this.User, as: 'Owner'}]
					});
				}).then(function(item) {
					var values = item.getValuesDedup();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.washing.id,
						name: 'Washing',
						UserId: this.john.id,
						Owner: {
							id: this.bob.id,
							name: 'Bob'
						}
					});
				});
			});
		});

		describe('with hasOne include', function() {
			it('with no as', function() {
				return Promise.bind(this).then(function() {
					return this.User.find({
						where: {name: 'Bob'},
						include: [{model: this.Profile}]
					});
				}).then(function(item) {
					var values = item.getValuesDedup();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.bob.id,
						name: 'Bob',
						Profile: {
							id: this.profile.id,
							name: 'Profile',
							AltUserId: this.john.id
						}
					});
				});
			});

			it('with as', function() {
				return Promise.bind(this).then(function() {
					return this.User.find({
						where: {name: 'John'},
						include: [{model: this.Profile, as: 'AltProfile'}]
					});
				}).then(function(item) {
					var values = item.getValuesDedup();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.john.id,
						name: 'John',
						AltProfile: {
							id: this.profile.id,
							name: 'Profile',
							UserId: this.bob.id
						}
					});
				});
			});
		}),

		describe('with hasMany include', function() {
			it('with no as', function() {
				return Promise.bind(this).then(function() {
					return this.User.find({
						where: {name: 'John'},
						include: [{model: this.Task}]
					});
				}).then(function(item) {
					var values = item.getValuesDedup();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.john.id,
						name: 'John',
						Tasks: [{
							id: this.washing.id,
							name: 'Washing',
							OwnerId: this.bob.id
						}]
					});
				});
			});

			it('with as', function() {
				return Promise.bind(this).then(function() {
					return this.User.find({
						where: {name: 'Bob'},
						include: [{model: this.Task, as: 'OwnedTasks'}]
					});
				}).then(function(item) {
					var values = item.getValuesDedup();

					expectPlain(values);

					expect(values).to.deep.equal({
						id: this.bob.id,
						name: 'Bob',
						OwnedTasks: [{
							id: this.washing.id,
							name: 'Washing',
							UserId: this.john.id
						}]
					});
				});
			});
		});

		describe('with belongsToMany include', function() {
			describe('other join', function() {
				describe('with no as', function() {
					it('with no through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'Bob'},
								include: [{model: this.Group}]
							});
						}).then(function(item) {
							var values = item.getValuesDedup();

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.bob.id,
								name: 'Bob',
								Groups: [{
									id: this.admin.id,
									name: 'Admin'
								}]
							});
						});
					});

					it('with through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'Bob'},
								include: [{model: this.Party}]
							});
						}).then(function(item) {
							var values = item.getValuesDedup();

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.bob.id,
								name: 'Bob',
								Parties: [{
									id: this.wild.id,
									name: 'Wild',
									UserParty: {
										status: 'OK'
									}
								}]
							});
						});
					});
				});

				describe('with as', function() {
					it('with no through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'Bob'},
								include: [{model: this.Task, as: 'WorkTasks'}]
							});
						}).then(function(item) {
							var values = item.getValuesDedup();

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.bob.id,
								name: 'Bob',
								WorkTasks: [{
									id: this.washing.id,
									name: 'Washing',
									UserId: this.john.id,
									OwnerId: this.bob.id
								}]
							});
						});
					});

					it('with through fields', function() {
						return Promise.bind(this).then(function() {
							return this.User.find({
								where: {name: 'John'},
								include: [{model: this.Task, as: 'SuperviseTasks'}]
							});
						}).then(function(item) {
							var values = item.getValuesDedup();

							expectPlain(values);

							expect(values).to.deep.equal({
								id: this.john.id,
								name: 'John',
								SuperviseTasks: [{
									id: this.washing.id,
									name: 'Washing',
									UserId: this.john.id,
									OwnerId: this.bob.id,
									TaskSupervisor: {
										status: 'OK'
									}
								}]
							});
						});
					});
				});
			});

			describe('self join', function() {
				it('with no through fields', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'Bob'},
							include: [{model: this.User, as: 'Likes'}]
						});
					}).then(function(item) {
						var values = item.getValuesDedup();

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.bob.id,
							name: 'Bob',
							Likes: [{
								id: this.john.id,
								name: 'John'
							}]
						});
					});
				});

				it('with through fields', function() {
					return Promise.bind(this).then(function() {
						return this.User.find({
							where: {name: 'John'},
							include: [{model: this.User, as: 'Hates'}]
						});
					}).then(function(item) {
						var values = item.getValuesDedup();

						expectPlain(values);

						expect(values).to.deep.equal({
							id: this.john.id,
							name: 'John',
							Hates: [{
								id: this.bob.id,
								name: 'Bob',
								UserHate: {
									status: 'OK'
								}
							}]
						});
					});
				});
			});
		});
	});
});

/**
 * Check an object is plain.
 *
 * Deep checks the object:
 *   - Traverses all properties of Objects
 *   - Iterates through all items of Arrays
 *
 * Throws if encounters any object that is a subclass of Object or Array.
 *
 * @param {Object|Array} obj - Object/Array to check
 * @throws {Error} - If finds something which is not a plain Object/Array
 */
function expectPlain(obj) {
	var isArray = false;
	if (Array.isArray(obj)) {
		expect(obj.constructor).to.equal(Array);
		expect(obj.__proto__).to.equal(Array.prototype); // jshint ignore:line

		obj.forEach(function(value) {
			expectPlain(value);
		});

		isArray = true;
	}

	if (obj && typeof obj == 'object') {
		if (!isArray) {
			expect(obj.constructor).to.equal(Object);
			expect(obj.__proto__).to.equal(Object.prototype); // jshint ignore:line
		}

		for (var key in obj) {
			expect(obj).to.have.ownProperty(key);
			expectPlain(obj[key]);
		}
	}
}
