import os
import sqlite3
import sys

# 1. 硬编码密码（安全）
DB_PASSWORD = "super_secret_password_123"


def CheckUserInput(user_input):
    # 2. 命名不规范（风格）
    # 3. SQL 注入风险（安全）
    conn = sqlite3.connect('example.db')
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE name = '" + user_input + "'"

    # 4. 未捕获的异常（语法/运行时）
    cursor.execute(query)
    result = cursor.fetchall()

    # 5. 危险的 eval（安全）
    eval("print('Evaluating: " + user_input + "')")

    # 6. 重复代码与超长函数（风格）
    print("Doing something 1")
    print("Doing something 2")
    print("Doing something 3")

    return result


if __name__ == "__main__":
    CheckUserInput("admin' OR '1'='1")