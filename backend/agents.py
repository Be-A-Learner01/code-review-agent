from langchain_deepseek import ChatDeepSeek
from langchain.agents import create_agent

#初始化模型
llm = ChatDeepSeek(model="deepseek-chat", temperature=0)


PROMPT_SYNTAX = (
    "你是代码语法检查专家。只关注：语法错误、类型问题、导入缺失、明显的运行时异常。"
    "不要评论安全或风格问题。逐条列出问题，包含行号、严重程度、修复建议。"
)

PROMPT_SECURITY = (
    "你是代码安全审查专家。只关注：SQL 注入、XSS、硬编码密钥/密码、不安全反序列化、"
    "路径穿越、未校验的输入。不要评论语法或风格问题。"
)

PROMPT_STYLE = (
    "你是代码风格审查专家。只关注：命名规范、函数长度、重复代码、注释质量、PEP 8。"
    "不要评论语法或安全问题。"
)

#语法审查专家
syntax_agent = create_agent(
    model=llm,
    tools=[],
    system_prompt=PROMPT_SYNTAX,
)

#安全审查专家
security_agent = create_agent(
    model=llm,
    tools=[],
    system_prompt=PROMPT_SECURITY,
)

#风格审查专家
style_agent = create_agent(
    model=llm,
    tools=[],
    system_prompt=PROMPT_STYLE,
)
