const { Model } = require('sequelize');

class ReadOnlyModel extends Model {
  static async create() {
    throw new Error(`${this.name} is read-only.`);
  }

  async save() {
    throw new Error(`${this.constructor.name} is read-only.`);
  }

  async update() {
    throw new Error(`${this.constructor.name} is read-only.`);
  }

  async destroy() {
    throw new Error(`${this.constructor.name} is read-only.`);
  }

  static async bulkCreate() {
    throw new Error(`${this.name} is read-only.`);
  }

  static async upsert() {
    throw new Error(`${this.name} is read-only.`);
  }

  static async destroy() {
    throw new Error(`${this.name} is read-only.`);
  }
}

module.exports = ReadOnlyModel;
