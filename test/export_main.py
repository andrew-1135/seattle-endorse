import re

def main():
    with open("src/main.js") as f:
        js_text = f.read().splitlines()

    start_index = js_text.index("/* GLOBAL CONSTANT VALUES */")
    end_index = js_text.index("/* LOCAL SIDE EFFECTS */")
    export_targets = "\n".join(js_text[start_index:end_index])
    export_targets = re.sub(
        r"^(function [a-zA-Z]+\()",
        r"export \1",
        export_targets,
        flags=re.MULTILINE
    )
    # for func in re.findall(r"^function ([a-zA-Z]+)\(", export_targets):
    #     export_targets += "exports.{} = {};\n".format(func, func)

    with open("test/exported-main.js", "w") as f:
        f.write(export_targets)

if __name__ == "__main__":
    main()
