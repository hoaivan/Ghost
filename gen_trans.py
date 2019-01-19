"""py3"""
import os
import re
from sys import argv

dir = os.path.dirname(os.path.realpath(__file__))
IGNORES = {"node_modules", "dist", ".vscode", "tmp", ".git", ".github"}
PATTERN = r"(({{t|\(t) (\"|\')(.*?)(\"|\')(}}|\)))"


def _list_files(startpath, process_file):
    print("From: {}\n".format(startpath))
    for root, dirs, files in os.walk(startpath):
        dirs[:] = [d for d in dirs if d not in IGNORES]
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * (level)
        print('{}{}/'.format(indent, os.path.basename(root)))
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            if f.endswith(".hbs"):
                print('{}{}'.format(subindent, f))
                process_file(os.path.join(root, f))


def check_admin_ui():
    vi_file = os.path.join(dir, "core/client/translations/vi-vn.yaml")
    en_file = os.path.join(dir, "core/client/translations/en-us.yaml")
    added = set()

    def _get_added(lang, exist):
        with open(lang, "r", encoding="utf-8") as f:
            for line in f:
                words = line.lstrip().split(":")
                if words:
                    exist.add(words[0])

    def _save(lang, lines):
        with open(lang, "a", encoding="utf-8") as out_file:
            for line in lines:
                phrases = re.findall(PATTERN, line)
                for p in phrases:
                    try:
                        new = p[3]
                    except Exception as ex:
                        print("\n>>> Exception when parse `{}`: {}\n".format(p, ex))
                        continue
                    if new and new not in added:
                        added.add(new)
                        out_file.write("{}: {}\n".format(new, new))

    def process_file(inp):
        with open(inp, "r+", encoding="utf-8") as in_file:
            _save(vi_file, in_file)

    _get_added(vi_file, added)
    # CHANGE PATH IF YOU WANT CHECK MORE
    _list_files(os.path.join(dir, "core/client/app/templates"), process_file)

    # sync eng
    added_en = set()
    _get_added(en_file, added_en)
    with open(en_file, "a", encoding="utf-8") as out_file:
        new = added - added_en
        for word in new:
            out_file.write("{}: {}\n".format(word, word))


if __name__ == "__main__":
    check_admin_ui()
    print('\n>>> Done')
