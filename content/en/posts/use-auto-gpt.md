---
title: 'Use Auto Gpt'
description:
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-03-18T16:28:30+08:00
draft : false
showtoc: true
tocopen: true
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
  - ai
  - autogpt
categories:
  - Development
---

## Preface

🔮 In my Slack workspace, multiple AIs are integrated, including ChatGPT 4, ChatGPT 3.5, Claude...

We can interact with AI for free and without restrictions through Slack. Everyone is welcome to join Slack. Here is the link:

[https://join.slack.com/t/kubecub/shared_invite/zt-1se0k2bae-lkYzz0_T~BYh3rjkvlcUqQ](https://join.slack.com/t/kubecub/shared_invite/zt-1se0k2bae-lkYzz0_T~BYh3rjkvlcUqQ)

![image-20230514215132365](http://sm.nsddd.top/sm202305142151717.png)



## introduce

I learned about Auto-GPT a long time ago. As the fastest growing project on GitHub in recent times (one of them), Auto-GPT is well known in the open source community. It has even quickly surpassed Kubernetes. Currently, there are `125k stars`.

Thanks to Auto-GPT’s outstanding technology, many tasks can be automated with high precision and efficiency. It leverages the powerful natural language processing capabilities of GPT-4.

We can even use it to achieve more automated work, such as the previous section [Developing an AI automatic cloud native project automatic launch tool on Sealos] (./49.md)



## What is AutoGPT

Its GitHub address:

+ [GitHub](https://github.com/Significant-Gravitas/Auto-GPT)

Essentially, Auto-GPT leverages the versatility of OpenAI’s latest artificial intelligence models to interact with software and services online, enabling them to “autonomously” perform tasks such as X and Y. But as we learn with large language models, this ability seems as wide as the ocean but as deep as a puddle.

AutoGPT is an AI-driven application that leverages the power of LLMs like GPT-4 to autonomously create and process a variety of jobs. By using Auto GPT, organizations and individuals can streamline processes such as report authoring, content creation, and data analysis to save time and reduce errors.

AutoGPT is a game changer in task automation, allowing organizations and individuals to focus on other critical tasks while leaving repetitive and menial tasks to programs.

As LLM continues to evolve, we can expect to see increasingly powerful software like Auto GPT capable of performing increasingly complex tasks.

AutoGPT offers a new direction in terms of how AI-driven technologies will change the way we operate and interact with AI systems in the future.



## How it works

Auto GPT uses the latest developments in LLM, specifically GPT-4, to automatically generate cohesive and relevant content. The program learns from large amounts of data, which allows it to identify patterns and connections between words and sentences.

Using this information, Auto GPT generates text in response to prompts or input. This input may come in the form of instructions, tasks, or a set of guidelines.

After receiving input, Auto GPT uses its cutting-edge algorithms and natural language processing skills to create contextually appropriate and logically consistent content. Auto GPT is an important resource for organizations and people looking to automate processes and save time because it generates text that is nearly indistinguishable from human written language.

The strength of Auto GPT is its ability to learn from large amounts of data and generate relevant and logical text, making it a key tool in the field of job automation.

Unlike the free version of ChatGPT, **Auto-GPT can connect to the Internet** and find the latest information on any topic. Therefore, you can use it to access any web page and capture information.



### What can be done

Auto GPT is a flexible program that can be used for a variety of activities, including report creation and data analysis. In this section, we'll look at some of the functions that Auto GPT can perform, and how it performs them automatically.

**Content Creation**

Content for websites, blogs, and social media posts can be created using Auto GPT. If you give it a theme or a set of guidelines, Auto GPT can produce high-quality, relevant, and interesting material.

**translate**

You can use Auto GPT to perform translation tasks. By using Auto GPT with input text in one language, you can translate the text into another language. It can be of great help to businesses that do business in different countries and need quick translation of documents or communications.

**customer service**

Customer support duties, such as responding to frequent inquiries and resolving issues, can be automated with Auto GPT. Auto GPT can use natural language processing to understand customer queries and provide relevant solutions.

**data analysis**

You can use Auto GPT to perform data analysis activities. Data input allows Auto GPT to analyze the information and generate insights that can be used for decision-making.

**Writing reports**

Businesses and researchers can use Auto GPT to generate reports based on data input. By entering data, Auto GPT can analyze the information and produce accurate and instructive results.

**coding**

Auto GPT can be used in coding jobs to generate complete programs or code snippets. Auto GPT can generate effective and efficient code by taking programming parameters or requirements into account. Developers who need to write code accurately and quickly will find this feature very helpful.

*Use your imagination, there is nothing you can’t think of~*



## Build and set up the environment

If you can **[use GPT-4](https://www.wbolt.com/how-to-use-gpt-4-free.html) API**, Auto-GPT works best because it Better at thinking and drawing conclusions. It's also less prone to hallucinations. If you don't have access yet, you can [use the link here](https://www.wbolt.com/go?_=18a71268abaHR0cHM6Ly9vcGVuYWkuY29tL3dhaXRsaXN0L2dwdC00LWFwaQ%3D%3D) to join the waitlist for GPT-4 API access. However, you can also use the normal OpenAI API with GPT-3.5 models.

**Preparation:**

1. Git

2.Python 3.8 or later

3. OpenAI API key

4.PineCone API key



Use git clone:

```bash
❯ git clone https://github.com/Significant-Gravitas/Auto-GPT
❯ cd Auto-GPT
```

Install:

> The requirements.txt file is a text file, usually used in Python projects, which contains all dependency packages and their version information required by the project.
>
> When we were studying the buildpacks project before, how it solved the python environment judgment problem was through the requirements.txt file.

```bash
❯ pip install -r requirements.txt
```

After that, rename `.env.template` to `.env` and populate the fields with OpenAI and PineCone API keys.

```bash
❯ mv .env.template .env
```

After that, go to VIM and paste the API in the `OPENAI_API_KEY` section. You can refer to the picture below to find out.

```bash
❯ cat .env | grep -i OPENAI_API_KEY
## OPENAI_API_KEY - OpenAI API Key (Example: my-openai-api-key)
OPENAI_API_KEY=your-openai-api-key
```



Next, open [pinecone.io](https://www.wbolt.com/go?_=baa37b74edaHR0cHM6Ly93d3cucGluZWNvbmUuaW8v) and create a free account. It will allow LLM to retrieve relevant information from memory for use in AI applications.

Here, click on `API Keys` in the left sidebar and click on `Create API Key` in the right pane

Give a name like `autogpt` and click `Create Key`

![image-20230503171039991](http://sm.nsddd.top/sm202305031712718.png)

Copy the Key Value, open it with `vim` and paste it next to `PINECONE_API_KEY`.

Likewise, copy the value under `Environment`.

Now, paste it next to PINECONE_ENV.



## Run

Open a terminal to execute the `main.py` Python script.

```bash
❯ python3 -m autogpt
```

**Name the AI:**

On the first run, Auto-GPT will ask you to name the AI. If you don't want to create an AI for a specific use case, you can leave this field blank and hit enter. It loads the Entrepreneur-GPT name by default.

**Define the role of artificial intelligence~**

After that, **set goals one by one for autonomous AI**. This is where you tell the AI what you want to achieve. You can ask it to save the information in a text or PDF file. You can also ask it to close after retrieving all information.

**Define AI Role:**

Give it a name and role based on what you want your AI to do, such as “researcher,” “content generator,” or “personal coder.” For more successful results, be clear about what you want your AI to achieve.

**set a goal:**

Outline the goals of artificial intelligence in detail, such as obtaining information, storing data in files, executing code, or modifying text. Include information about the output file to use, and any other operations required to complete the job.

The goals are as follows:

1. Develop products

2. Optimize products

3. Expand product scale

4. Generate more than $50 million in revenue

5. Maintain this consistency

Auto-GPT will start thinking. During the action, it will ask you to authorize the action. **Press "y"** and then press **Enter** to confirm. It may connect to the website and collect information.

You can read **what the AI is thinking, reasoning and planning**. It also provides criticism (a negative cue) so that it comes up with the right information. Finally, it performs the action.



## AutoGPT plugin

You can tailor AutoGPT to your unique needs

They do not require significant changes to the core code of the main application because they are designed to extend or improve its functionality.

The plug-in list is as follows:

1. Twitter plugin

2. Email plugin

3. Telegram plugin

4. Google Analytics plugin

5. Youtube plugin, and many more.



## The future of Auto GPT and LLM

While LLMs like GPT-4 offer great promise for revolutionizing work automation, there may be dangers and drawbacks that need to be considered. The potential for bias and stereotypes in the data used to train models is one of the key reasons for concern. A biased LLM can lead to unfair and discriminatory results.

As Auto-GPT and ChatGPT demonstrate, LLM can be taught to learn from huge amounts of data and independently perform a wide range of activities, from content production to coding. Automated operations have the power to completely transform the industry and the way we operate.

But for LLM, Auto-GPT is just the beginning. As technology develops further, the power of LLMs will increase. The LLMs of the future will be better at completing complex tasks and understanding context and complexity.

Automating LLM tasks may also open up new markets and job opportunities. If businesses and people could automate many mundane tasks, they would be able to focus on more difficult and imaginative projects.



## Auto-GPT Alternative: Automate tasks with AgentGPT

If you don't want to set up Auto-GPT locally and want an easy-to-use solution for automating and deploying tasks, you can use AgentGPT. It's built on Auto-GPT, but you can access it directly in your browser. No need to fiddle with terminals and commands. Here's how it works.

> Disadvantage: Cannot access local ~



### Open and use+ [https://agentgpt.reworkd.ai/zh](https://agentgpt.reworkd.ai/zh)

Here, add your OpenAI API key. You can get the API key from [here](https://www.wbolt.com/go?_=e7e2fef44aaHR0cHM6Ly9wbGF0Zm9ybS5vcGVuYWkuY29tL2FjY291bnQvYXBpLWtleXM%3D)**. If you don't have access to the [GPT-4](https://www.wbolt.com/how-to-use-gpt-4-free.html) API, select `gpt-3.5-turbo` as the model and click ` Save`

![image-20230503174431508](http://sm.nsddd.top/sm202305031744911.png)

Next, give your AI agent a name and set the goals you want to achieve. Now, click Auto-GPT AI’s `Deploy Agent` to start considering your investment.

I found that I have no money~

![image-20230503175554002](http://sm.nsddd.top/sm202305031755504.png)

Once the task is completed, you can click "**Save**" or "Copy" to get the final result.



## END link

### Reference article

+ [How to install and use the autonomous artificial intelligence tool Auto-GPT](https://www.wbolt.com/auto-gpt.html)
+ [Eight ways to use Auto-GPT](https://juejin.cn/post/7226665757882449978)
+ [Zhihu: Install and use Auto-GPT](https://zhuanlan.zhihu.com/p/621854926)
+ [Auto-GPT-ZH independent GPT4 experiment](https://github.com/kaqijiang/Auto-GPT-ZH)
+ [Advanced LLMOps Architecture](https://matt-rickard.com/a-high-level-llmops-architecture)



Some of the resources I used to create this project:

+ [Significant-Gravitas/Auto-GPT](https://github.com/Significant-Gravitas/Auto-GPT) is the main inspiration for this project.
+ [tiktoken-go/tokenizer](https://github.com/tiktoken-go/tokenizer) to count tokens before sending the prompt to OpenAI.
+ [pavel-one/EdgeGPT-Go](https://github.com/pavel-one/EdgeGPT-Go) to connect to Bing Chat.
+ [PullRequestInc/go-gpt3](https://github.com/PullRequestInc/go-gpt3) to send requests to OpenAI.
+ [Danny-Dasilva/CycleTLS](https://github.com/Danny-Dasilva/CycleTLS) to mimic the browser when connecting to Bing Chat.
+ [chromedp/chromedp](https://github.com/chromedp/chromedp) to control the browser from golang code.