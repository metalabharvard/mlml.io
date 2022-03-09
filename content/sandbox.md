---
updated_at: "2021-11-12T12:47:20.965Z"
created_at: "2021-06-17T15:57:31.606Z"
lastmod: "2021-11-12T12:47:20.965Z"
date: "2021-06-17T15:57:31.606Z"
title: Sandbox
layout: sandbox
slug: sandbox
hidden: true
noindex: true

---
### Headings

To create a heading, add number signs (#) in front of a word or phrase. The number of number signs you use should correspond to the heading level. For example, to create a heading level three (`<h3>`), use three number signs (e.g., `### My Header`). Please do not use headline level 1 as this is already used as page title.

```
## Headline 2
### Headline 3
#### Headline 4
##### Headline 5
###### Headline 6
```

The rendered output looks like this:

## Headline 2
### Headline 3
#### Headline 4
##### Headline 5
###### Headline 6

### Line Breaks
To create a line break or new line (`<br>`), end a line with two or more spaces, and then type return.

### Emphasis
You can add emphasis by making text bold or italic.

To italicize text, add *one asterisk* before and after a word or phrase like this `*one asterisk*`. To bold text, add **two asterisks** before and after a word or phrase like this `**two asterisks**`. To emphasize text with bold and italics at the same time, add ***three asterisks*** before and after a word or phrase like this `***three asterisks***`.

### Strikethrough
You can strikethrough words by putting a horizontal line through the center of them. The result looks ~~like this~~. This feature allows you to indicate that certain words are a mistake not meant for inclusion in the document. To strikethrough words, use two tilde symbols (`~~`) before and after the words.

```md
~~The world is flat.~~ We now know that the world is round.
```
The rendered output looks like this:
~~The world is flat.~~ We now know that the world is round.

### Blockquotes
To create a blockquote, add a > in front of a paragraph.

```md
> Dorothy followed her through many of the beautiful rooms in her castle.
```
The rendered output looks like this:

> Dorothy followed her through many of the beautiful rooms in her castle.

Blockquotes can contain multiple paragraphs. Add a > on the blank lines between the paragraphs.

```md
> Dorothy followed her through many of the beautiful rooms in her castle.
>
> The Witch bade her clean the pots and kettles and sweep the floor and keep the fire fed with wood.
```
The rendered output looks like this:

> Dorothy followed her through many of the beautiful rooms in her castle.
>
> The Witch bade her clean the pots and kettles and sweep the floor and keep the fire fed with wood.

### Lists

#### Ordered Lists
To create an ordered list, add line items with numbers followed by periods. The numbers don’t have to be in numerical order, but the list should start with the number one.

```md
1. First item
2. Second item
3. Third item
4. Fourth item
```
The rendered output looks like this:

1. First item
2. Second item
3. Third item
4. Fourth item

**You can not start a list with a number other than one.**

If you need to start an unordered list item with a number followed by a period, you can use a backslash (`\`) to escape the period.

```md
- 1968\. A great year!
- I think 1969 was second best. 
```

- 1968\. A great year!
- I think 1969 was second best.

#### Unordered Lists
To create an unordered list, add dashes (-), asterisks (*), or plus signs (+) in front of line items. Indent one or more items to create a nested list.

```md
- First item
- Second item
- Third item
- Fourth item
```
The rendered output looks like this:

- First item
- Second item
- Third item
- Fourth item


#### Formatting Links

To emphasize links, add asterisks before and after the brackets and parentheses. To denote links as code, add backticks in the brackets.

```md
I love supporting the **[EFF](https://eff.org)**.
This is inspired by the *[Markdown Guide](https://www.markdownguide.org)*.
```
The rendered output looks like this:
I love supporting the **[EFF](https://eff.org)**.
This is inspired by the *[Markdown Guide](https://www.markdownguide.org)*.

### Tables
To add a table, use three or more hyphens (---) to create each column’s header, and use pipes (|) to separate each column. For compatibility, you should also add a pipe on either end of the row.

```md
| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |
```

The rendered output looks like this:

| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |

Tip: Creating tables with hyphens and pipes can be tedious. To speed up the process, try using the [Markdown Tables Generator](https://www.tablesgenerator.com/markdown_tables). Build a table using the graphical interface, and then copy the generated Markdown-formatted text into your file.

### Code
To denote a word or phrase as code, enclose it in backticks (`).

```md
At the command prompt, type `nano`.
```
The rendered output looks like this:

At the command prompt, type `nano`.

### Code Blocks
To create code blocks, use three backticks (`) at the beginning and the end of the code block.

~~~md
```
<html>
  <head>
  </head>
</html>
```
~~~

The rendered output looks like this:

```
<html>
  <head>
  </head>
</html>
```

To add syntax highlighting, specify a language next to the backticks before the fenced code block.

~~~
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
```
~~~

The rendered output looks like this:

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
```