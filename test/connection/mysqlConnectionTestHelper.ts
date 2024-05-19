import { MysqlConnectionPool } from "../../src/connection/mysqlConnectionPool";
import { MysqlConnectionConfig } from "../../src/index";
import { Student } from "../db/entity/student";

export class MysqlConnectionTestHelper {
  public async testTransactionInsert(): Promise<void> {
    try {
      const config = new MysqlConnectionConfig();
      config.database = "northwind";
      config.host = "localhost";
      config.user = "root";
      config.password = "123456";
      const pool = new MysqlConnectionPool(config, true);
      const conn = await pool.getConnection();
      const newStudent = new Student();
      newStudent.name = new Date().toString();
      newStudent.age = 30;
      await conn.beginTransaction();
      const insertSqlTemplate = `INSERT INTO student values(?, ?)`;
      await conn.run(insertSqlTemplate, [newStudent.name, newStudent.age]);
      await conn.commit();
      const selectMatchStudentTemplate = `SELECT * FROM student where name = ?`;
      const matchStudent = await conn.selectEntities<Student>(Student, selectMatchStudentTemplate, [newStudent.name]);
      await conn.release();
      return new Promise<void>((resolve, reject) => {
        if (matchStudent.length === 1) {
          resolve();
        } else {
          reject("could not find insert student");
        }
      });
    } catch (e) {
      return new Promise<void>((resolve, reject) => reject(e));
    }
  }

  public async testTransactionInsertThenRollback(): Promise<void> {
    try {
      const config = new MysqlConnectionConfig();
      config.database = "northwind";
      config.host = "localhost";
      config.user = "root";
      config.password = "123456";
      const pool = new MysqlConnectionPool(config, true);
      const conn = await pool.getConnection();
      const newStudent = new Student();
      newStudent.name = "rollback" + new Date().toString();
      newStudent.age = 30;
      await conn.beginTransaction();
      const insertSqlTemplate = `INSERT INTO student values(?, ?)`;
      await conn.run(insertSqlTemplate, [newStudent.name, newStudent.age]);
      await conn.rollback();
      const selectMatchStudentTemplate = `SELECT * FROM student where name = ?`;
      const matchStudent = await conn.selectEntities<Student>(Student, selectMatchStudentTemplate, [newStudent.name]);
      await conn.release();
      return new Promise<void>((resolve, reject) => {
        if (matchStudent.length === 0) {
          resolve();
        } else {
          reject("should not find insert item since rollback");
        }
      });
    } catch (e) {
      return new Promise<void>((resolve, reject) => reject(e));
    }
  }
}
