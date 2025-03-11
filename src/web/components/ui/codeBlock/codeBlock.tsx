import { FC, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
// @ts-ignore
import SyntaxHighlighter from 'react-native-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
export type CodeBlockProps = {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
};

export const CodeBlock: FC<CodeBlockProps> = ({
  code,
  language = 'tsx',
  showLineNumbers = true,
}) => {
  const highlightTSX = (codeLine: string) => {
    const elements: JSX.Element[] = [];
    let lastIndex = 0;

    const pushText = (text: string, className = 'text-gray-200') => {
      if (text)
        elements.push(
          <Text key={elements.length} className={`${className} font-mono`}>
            {text}
          </Text>
        );
    };

    const patterns: { regex: RegExp; className: string }[] = [
      {
        regex: /\b(import|from|export|const|let|var|function|return|class)\b/g,
        className: 'text-purple-500',
      },
      { regex: /(["'`].*?["'`])/g, className: 'text-green-500' },
      { regex: /(\b\d+\b)/g, className: 'text-blue-400' },
      { regex: /(\/\/.*|\/\*[\s\S]*?\*\/)/g, className: 'text-gray-500' },
    ];

    for (const { regex, className } of patterns) {
      codeLine.replace(regex, (match, ...groups) => {
        const matchIndex = groups[groups.length - 2]; // Get match index
        pushText(codeLine.slice(lastIndex, matchIndex)); // Push preceding text
        pushText(match, className); // Push matched text
        lastIndex = matchIndex + match.length;
        return match;
      });
    }

    pushText(codeLine.slice(lastIndex)); // Add remaining text

    return elements;
  };

  const renderCodeLines = () => {
    return code.split('\n').map((line, i) => (
      <View key={i} className="flex-row">
        {showLineNumbers && (
          <Text className="pr-4 text-right text-gray-500 select-none w-12">
            {i + 1}
          </Text>
        )}
        <View className="flex-row flex-wrap">{highlightTSX(line)}</View>
      </View>
    ));
  };

  return (
    <View className="rounded-lg overflow-hidden my-4 w-full shadow-md">
      <View className="flex-row items-center justify-between bg-gray-100 px-4 py-2">
        <Text className="text-sm font-medium text-black">{language}</Text>
      </View>
      {/* <ScrollView horizontal className="p-4 w-full"> */}
      <View className="bg-gray-100">
        <SyntaxHighlighter
          language={'jsx'}
          style={vs}
          highlighter={'prism'}
          fontFamily={'monospace'}
          fontSize={16}
        >
          {code}
        </SyntaxHighlighter>
      </View>
      {/* </ScrollView> */}
    </View>
  );
};
