---
title: 'Emerging Challenges and Trends in 2024'
ShowRssButtonInSectionTermList: true
cover.image:
date: 2024-01-14T22:52:24+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author:
  - "Xinwei Xiong"
  - "Me"
keywords: []
tags:
  - blog
categories:
  - Development
description: >
  Explore the latest trends and challenges in 2024 in the world of technology and development.
---

# Large language model sharing meeting on January 6, 2024

**Limitations of the model:**

- Deep learning
- Pre-trained model
- Large language model

**The emergent power of large language models:**

<aside>
💡 Relevant research on emergence phenomena has been done for a long time in the discipline of complex systems. So, what is “emergent phenomenon”? When a complex system is composed of many tiny individuals, these tiny individuals come together and interact with each other. When the number is large enough, they exhibit special phenomena that cannot be explained by the microscopic individuals at the macro level. This can be called an "emergent phenomenon."

</aside>

> Link:
>

[The Mystery of the Evolution of Large Language Models: Challenges and Controversies of Emergent Phenomenon_AI_Zhang Junlin_InfoQ Selected Articles](https://www.infoq.cn/article/gjljp08ihuud8shahhz3)

**Changes in the characteristics and trends of large language models:**

Big language understands human habits better than people.

- Training with RLHF
- Interact in the way humans are accustomed to

**The development history of large language models:**

- There are more and more open source models, and the proportion is getting larger and larger.
- There are still a lot of pre-trained models, but the proportion of fine-tuning is getting higher and higher.

### How to learn large language models

- Configuration of the model structure
- Fine-tuning of large language models
- skills

### Train the model yourself

It doesn’t have to be just a single data, it can also be a mixture of data (including business documents or code provided by yourself)

**Training data source:**

<aside>
💡 For data security and deduplication of duplicate data, data filtering is very important (how to do this step?)

</aside>

When processing and preparing data for machine learning model training, it is important to ensure the quality, security, and deduplication of the data. Here are some key steps and methods to help you achieve this goal:

1. **Quality Filtering**:
     - Ensure data accuracy: remove or correct any erroneous, incomplete or inaccurate data.
     - Ensure data consistency: Ensure that all data follows the same format and standards.
2. **Data Deduplication**:
     - Identify and remove duplicate data: Use algorithms or tools to identify identical or highly similar data items and merge or delete them.
     - For text data, you can use hashing algorithms or content-based deduplication methods.
3. **Privacy Removal**:
     - Ensure that the data does not contain any personally identifiable information (PII), such as name, address, phone number, etc.
     - In some cases, data desensitization techniques, such as anonymization or pseudo-anonymization, can be used to protect user privacy.
4. **Tokenization**:
     - For text data, tokenization is the process of splitting continuous text into smaller units such as words, phrases, or characters.
     - Word segmentation methods depend on the grammatical and lexical structure of the specific language. For Chinese, a specific word segmentation tool may be needed because Chinese is a non-space separated language.

### Decoder structure

"causal decoder" and "prefix decoder" are two different decoder structures that play an important role in processing sequence data, especially in text generation tasks. Here's a comparison of the two decoders:

### Causal Decoder

1. **Definition and Application**:
     - The causal decoder, as used in the GPT family of models, is a one-way decoder.
     - When generating text, it only considers the context that has already been generated or given (i.e. it only sees the context on the left).
2. **Working Principle**:
     - When processing each new word, the causal decoder only uses the previous words as context.
     - This model simulates the way humans generate natural language, which is to sequentially generate new information based on known information.
3. **Use**:
     - Suitable for text generation tasks such as storytelling, automatic writing, chatbots, etc.
4. **Features**:
     - Ensures that the generated text is coherent and logically follows the previous context.
     - Unable to look back or consider future vocabulary or sentence structure.

### Prefix Decoder (prefix decoder)

1. **Definition and Application**:
     - The prefix decoder is a decoder that can consider both the preceding and following contexts, similar to the masked language model (MLM) in BERT.
     - It can consider both prefix and suffix information in the sequence when processing data.
2. **Working Principle**:
     - When processing each word, the prefix decoder uses the preceding word and some following placeholders or masks as context.
     - This method allows the decoder to take into account the structure of the entire sequence when generating a certain word.
3. **Use**:
     - Commonly used for tasks that require two-way context understanding, such as text blank filling, sentence improvement, language model training, etc.
4. **Features**:
     - Ability to take into account more comprehensive contextual information when generating text.
     - Better for understanding the structure and meaning of an entire sentence or paragraph.

### Optimization of model structure

Model structure optimization has always been a fancy job. Excellent model structure design can greatly improve the efficiency of model parameters, and even the effect of small models can exceed that of large models. In this article, we take XLNet, ALBERT, and ELECTRA as examples for analysis. Although they can also be considered as work on pre-training task optimization and model lightweighting, given the strong innovation in model structure, we still analyze them in the model structure optimization section.

- **XLNet**
    
     [xlnet.pdf](https://prod-files-secure.s3.us-west-2.amazonaws.com/75a5484a-0cd7-4657-9986-f815c6264948/8ae97691-bde6-472c-9fed-12fc527fc843/xlnet. pdf)
    
     - Github source code: ‣

### Fine-tuning

Factors to consider when fine-tuning:

- Effect: Customization - local knowledge base search, question and answer in specific fields, etc.
- Cost: training cost - graphics card and other costs (the United States now restricts Chinese graphics cards)

What data needs to be retained for fine-tuning?

```jsx
(base) root@openim-System-Product-Name:/home/openim# nvidia-smi
Sat Jan 6 14:39:30 2024
+------------------------------------------------- -----------------------------------------------+
| NVIDIA-SMI 535.129.03 Driver Version: 535.129.03 CUDA Version: 12.2 |
|-----------------------------------------+------ ---------------+----------------------+
| GPU Name Persistence-M | Bus-Id Disp.A | Volatile Uncorr. ECC |
| Fan Temp Perf Pwr:Usage/Cap | Memory-Usage | GPU-Util Compute M. |
| | | MIG M. |
|=========================================+======= ===============+======================|
| 0 NVIDIA GeForce RTX 4090 Off | 00000000:01:00.0 Off | Off |
| 0% 33C P8 17W / 450W | 33MiB / 24564MiB | 0% Default |
| | | N/A |
+----------------------------------------+------ ---------------+----------------------+
                                                                                         
+------------------------------------------------- -----------------------------------------------+
| Processes: |
| GPU GI CI PID Type Process name GPU Memory |
| ID ID Usage |
|================================================== ======================================|
| 0 N/A N/A 2960548 G /usr/lib/xorg/Xorg 9MiB |
| 0 N/A N/A 2960714 G /usr/bin/gnome-shell 10MiB |
+------------------------------------------------- -----------------------------------------------+
```

- ChatGpt parsing
    
     ```jsx
     (base) root@openim-System-Product-Name:/home/openim# nvidia-smi
     Sat Jan 6 14:39:30 2024
     +------------------------------------------------- -----------------------------------------------+
     | NVIDIA-SMI 535.129.03 Driver Version: 535.129.03 CUDA Version: 12.2 |
     | (NVIDIA system management interface version) (Graphics card driver version) (CUDA version) |
     +----------------------------------------+------------- ----------+--------------------------+
     | GPU Name Persistence-M | Bus-Id Disp.A | Volatile Uncorr. ECC |
     | (GPU number and name) (persistence mode status) | (bus ID) (show activity or not) | (uncorrected volatile error check) |
     |Fan Temp Perf Pwr:Usage/Cap | Memory-Usage | GPU-Util Compute M. |
     | (Fan Speed) (Temperature) (Performance Status) (Power Usage/Cap) | (Video Memory Usage) | (GPU Utilization) (Compute Mode) |
     | | | MIG M. |
     | | | (MIG mode status) |
     +----------------------------------------+------ ---------------+----------------------+
     | 0 NVIDIA GeForce RTX 4090 Off | 00000000:01:00.0 Off | Off |
     | (GPU number) (GPU model) (persistence mode) | (bus ID) (show activity) | (volatile error checking) |
     | 0% 33C P8 17W / 450W | 33MiB / 24564MiB | 0% Default |
     | (Fan Speed) (Current Temperature) (Performance Status) (Current/Maximum Power) | (Current/Total Video Memory) | (GPU Utilization) (Compute Mode) |
     | | | N/A |
     +----------------------------------------+------ ---------------+----------------------+
                                                                                             
     +------------------------------------------------- -----------------------------------------------+
     | Processes: |
     | (process list) |
     | GPU GI CI PID Type Process name GPU Memory |
     | (GPU number) (GI) (CI) (Process ID) (Type) (Process name) (GPU memory usage) |
     |================================================== ======================================|
     | 0 N/A N/A 2960548 G /usr/lib/xorg/Xorg 9MiB |
     | (GPU number) (N/A) (N/A) (Process ID) (Graphics process) (Process name) (Video memory usage) |
     | 0 N/A N/A 2960714 G /usr/bin/gnome-shell 10MiB |
     | (GPU number) (N/A) (N/A) (Process ID) (Graphics process) (Process name) (Video memory usage) |
     +------------------------------------------------- -----------------------------------------------+
     ```
    

**Fine-tuning-Adapter:**

The **Adapter** module is added to each layer of the pre-trained model. During fine-tuning, only the parameters of the **Adapter** are updated. The **Adapter** is 2 linear layers, which reduces the dimension now and then increases the dimension. Fine-tuning for different tasks.

[Finetuning LLMs Efficiently with Adapters](https://magazine.sebastianraschka.com/p/finetuning-llms-with-adapters)

**Fine-tuning-lora:**

[Practical Tips for Finetuning LLMs Using LoRA (Low-Rank Adaptation)](https://magazine.sebastianraschka.com/p/practical-tips-for-finetuning-llms)

**Fine-tuning-qlora:**

> Compare lora:
>

[LoRA and QLoRA- Effective methods to Fine-tune your LLMs in detail.](https://medium.com/@levxn/lora-and-qlora-effective-methods-to-fine-tune-your-llms-in -detail-6e56a2a13f3c)

github:

[GitHub - artidoro/qlora: QLoRA: Efficient Finetuning of Quantized LLMs](https://github.com/artidoro/qlora?tab=readme-ov-file)

blog:

[QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314)

## LangChain-AI

https://github.com/langchain-ai/langchain

**Architectural Design:**

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/75a5484a-0cd7-4657-9986-f815c6264948/cffb91d2-ba01-4b2d-a872-e50d673d1e67/Untitled.png )

LangChain-Core is the core function

**LangChain Hub:**

<aside>
💡 LangSmith also supports privatized deployment and provides full life cycle observability capabilities

</aside>

[LangSmith](https://smith.langchain.com/hub?organizationId=757a0f72-774c-5d23-8e2a-61e730f41b20)

> Langsmith’s invite code needs to be obtained from others, github issue or mail
>

LangChain Chat:

https://chat.langchain.com/

## AI Agent

Although everyone from Bill Gates to OpenAI is talking about AI Agent, it does not yet have a precise definition. At present, the consensus reached in the industry about AI Agent mainly comes from a blog post by OpenAI. It defines AI Agent as: a large language model serves as the brain. Agent has the ability to perceive, remember, plan and use tools, and can automatically achieve the user's complex goals. This actually lays the basic framework of AI Agent.

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/75a5484a-0cd7-4657-9986-f815c6264948/97a4bb6e-5bc5-4b45-8dbf-2c61e6c7447b/Untitled.png )

**Wall-Facing Intelligence (ModelBest)** A large model full-process automated software development framework OpenBME/ChatDev jointly developed with the NLP Laboratory of Tsinghua University

https://github.com/OpenBMB/ChatDev

https://chatdev.toscl.com/zh

Install the plugin using:

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/75a5484a-0cd7-4657-9986-f815c6264948/590b5b0d-cf4b-4052-9ec6-c28f7ce88833/Untitled.png )

**Classic projects of AI Agent:**

https://github.com/Significant-Gravitas/AutoGPT

## Build a question and answer system using large models

Traditional search systems are based on keyword matching. When facing business scenarios such as game guides, technical maps, and knowledge bases, they lack the ability to understand user questions and secondary processing of answers.

Large Language Model (LLM), through its ability to understand and generate natural language, can figure out user intentions, summarize and integrate original knowledge points, and generate more appropriate answers. About basic ideas, verification effects and expansion directions

**Large model building question and answer model:**

1. Use fine-tuning method (MedGPT, medical large model, ChatMed)
2. Use fine-tuning combined with plug-in knowledge base (large legal model, ChatLaw)
3. Leverage the capabilities of general large models and use plug-in knowledge bases.

**Excellent open source projects:**

https://github.com/chatchat-space/Langchain-Chatchat

https://github.com/MetaGLM/FinGLM

https://github.com/lm-sys/FastChat

> Requirements: For the same type of question and answer system, similar to the OpenKF project http://github.com/OpenIMSDK/openkf
Implement a local knowledge base (the underlying knowledge base LLM model can be replaced or even connected to the API):
>
>
> ![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/75a5484a-0cd7-4657-9986-f815c6264948/4ec213b0-dac3-48fa-a077-26d5486eab48/Untitled. png)
>

To create a **Domain-specific Knowledge** **Question and Answer** system, the specific requirements are:

- Interact with users through natural language question and answer, supporting both Chinese and English.
- Understand users' different forms of questions and find matching answers. Secondary processing of answers can be performed, such as deduplication and aggregation of multiple associated knowledge points.
- Support context. Some questions may be complex or cannot be covered by original knowledge and require information to be extracted from historical conversations.
- precise. Don't appear [plausible]Or meaningless](https://link.zhihu.com/?target=https%3A//www.entrepreneur.com/growth-strategies/the-advantages-and-disadvantages-of-chatgpt/450268)’s answer. (Especially important for the financial industry)

Some questions don't necessarily need to be answered with large models, either. For some questions, such as computer-related questions and questions with reasoning, the output of the model is prone to problems. We use the method of directly building templates to answer, or use the FAQ question and answer system.

> FAQ question and answer system project:
https://github.com/wzzzd/FAQ_system
>

[Build a FAQ intelligent question and answer system](https://zhuanlan.zhihu.com/p/602337390)

**resource:**

> Organize open source Chinese language models, focusing on smaller models that can be deployed privately and have lower training costs, including base models, fine-tuning and applications in vertical fields, data sets and tutorials, etc.
>

https://github.com/HqWu-HITCS/Awesome-Chinese-LLM

## FAQ

- Core competitiveness under the big language model
- Training data for large language models (including code OR issue)
- The impact of the construction format of the knowledge base on accuracy: There is no standardized paradigm for data analysis. What is defined is a collection of questions, and then starts from the structure of the data (slices and document blocks)
- Recall rate questions: Record questions and recall answers in one-to-one correspondence;
- Large model hallucination phenomenon: Do not answer unfamiliar and uncertain questions, process from the prompt words, and return to recall
- Multiple knowledge bases of the enterprise: How to choose the specified knowledge base to answer the large model, and use the large model to do fine-tuning and classification tasks
- Special data (picture) processing of PDF, and processing of redundant information