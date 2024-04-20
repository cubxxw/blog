---
title: 'Openim Devops Design'
description:
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-09-16T16:13:36+08:00
draft : false
showtoc: true
tocopen: true
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
  - openim
  - en
categories:
  - Development
---

## DevOps

[DevOps](https://en.wikipedia.org/wiki/DevOps)


🔥 DevOps is a culture and methodology for software development and operations that aims to shorten the software development cycle and improve software quality through automation and collaboration.

**DevOps** (a portmanteau of Development and Operations) is a A culture, movement or practice that values communication and cooperation between "software developers (Dev)" and "IT operations and maintenance technicians (Ops)". By automating the "software delivery" and "architecture change" processes, we can build, test, and release software faster, more frequently, and more reliably.

**Why does OpenIM need DevOps? **

> I would like to sum it up in one sentence, DevOps can solve OpenIM's current team management, organize teams efficiently, and collaborate and communicate through **automation** tools.

This enables more stable products to be delivered more frequently with less waste.

**What did OpenIM look like in the beginning? **

I found a very old version before, the link is: [https://github.com/OpenIMSDK/Open-IM-Server/tree/test-tuoyun](https://github.com/OpenIMSDK/Open-IM -Server/tree/test-tuoyun)

There is almost always a loss of commit information, because incomplete information leads to the inability to track the code, resulting in a series of problems such as missing documentation and irregular code.

**We span from primitive society to traditional collaborative methods and then to devops behind**

Why even now, I still haven’t converted OpenIM to devops? This is an obvious criterion. Every operation, maintenance and interaction work still needs to be done manually by me, which undoubtedly differentiates the responsibilities of dev and ops. Not only does it make costs higher and efficiency lower, but more importantly, the team loses a clearer positioning.

So what's my next plan?

Whether it is prow, actions, etc. CI tools, as well as various ops (gitops, aiops, chatops,) or various designed automation and automated management tools, automated interaction tools.

**There is no doubt that they are a system:**

Providing a non-aware development environment, no matter whether the delivery is frequent or not, each feature's PR can be quickly, standardized and undergo a large number of automated tests, which makes it go online faster and respond to customer needs faster. Fewer changes are released each time, so the risk, merge conflicts, and workload are reduced. Moreover, code review is more convenient, and the code quality and team level are improved to a very high level.

🔥 My design concept for OpenIM at that time was that the main branch should be used as a traditional dev branch to ensure that the code is up-to-date and basically reliable, and the release-v* branch should be used as a stable branch.
The most important thing about DevOps is automation and automated operation and maintenance. Automation is highly encouraged and even allows developers to go through the entire automated process even if they don’t know any operation and maintenance.

OpenIM's team constraint formulation: [https://traveling-thistle-a0c.notion.site/OpenIM-standardization-ebd0c1529ab54e4fb92840e67a73aac1?pvs=4](https://www.notion.so/OpenIM-standardization-ebd0c1529ab54e4fb92840e67a73aac1?pvs= twenty one)

## Agile system

When it comes to DevOps, we first think of the very famous **Agile Development System**

> [Agile](https://learn.microsoft.com/zh-cn/devops/plan/what-is-agile) Development is a term used to describe iterative software development. Iterative software development shortens the DevOps life cycle by completing work in short increments, often called sprints. Sprints usually last from one to four weeks. Agile development is often contrasted with traditional or waterfall development, where large projects are planned in advance and completed according to the plan.

**Four core values define what Agile is, and twelve principles serve as twelve guidelines for implementing Agile**

### Four core values

The four core values are an important part of the Agile Development Manifesto, jointly proposed by a group of software developers in 2001 to guide the practice of agile software development methods.

1. **Individuals and interactions** trump processes and tools
    This means emphasizing the importance of communication, collaboration, and understanding among members within a team, arguing that effective communication between people is more critical than overemphasizing burdensome processes and tools.

     For OpenIM, the process is very clear and the tools are very simple, such as only github (issue, pr, wiki, projects) and Google (docs, form, table, drive)

2. **Working software** beats comprehensive documentation
    This value emphasizes that actual working software products are more valuable than detailed documentation. Although the importance of documentation cannot be ignored, priority is given to delivering a functional software product.

3. **Customer collaboration** trumps contract negotiation
    Emphasize close cooperation and continuous communication with customers to meet customer needs and continuously adapt to changes during the project development process, rather than over-reliance on contracts and negotiations.

4. **Responding to change** beats following a plan
    This value emphasizes that agile teams should be open to changes in requirements and be able to flexibly adjust plans to better adapt to changing circumstances and needs.

**Here I need to explain additionally the version driver of OpenIM and how to design it to comply with your own Semantic 2.0.0 ideas**

Generally, all versions with the first semantic number 0 default to an unstable API. The first semantic version serves as the API incompatible version.

Use **milestone** and roadmap** as the driver for the second version. For example, if my **milestone** is set to v1.0, then this is for the release-v1.0 branch and for all bugs in the v1.0 milestone. Issues will be fixed to release-v1.0, all feature issues will be put into v1.1, and will be released to release-v1.1 in the future.

> Roadmap is actually not easy to plan. I am not sure when the second semantic version will be upgraded. I will write all the important features into the roadmap and make detailed plans within 2-4 weeks. In 1~3 Make a rough plan within the month, put about a year into the rough plan, and then use it as ideas ~

According to **time** or some important **bug** as the third version of the driver, for example, I solved a lot of small bugs some time after the release of openim `release-3.0`, and these bugs were put into v3 .0 milestone, and then put the feature into the v3.1 milestone. I will plan one week or two weeks to extract all the issues that have been closed at the v3.0 milestone and merge them into the `release-v3.0` branch. .

### Twelve principles

The Twelve Principles are guiding principles that further expand and explain the Agile Development Manifesto. They provide more specific guidance for implementing agile development and are used to guide the team's behavior and decisions in the project.

1. **Highest Priority**: Satisfy customers by delivering valuable software early and continuously.
2. **Welcome changes**: Changes in customer needs are welcome at any time, even in the later stages of the project. Agile processes flexibly adapt to changes to give customers a competitive advantage.
3. **Frequent Delivery**: Deliver working software as often as possible at intervals of weeks or months so customers can quickly gain business value.
4. **Cooperation**: Business people and developers must work closely together throughout the project and work together to achieve common goals.
5. **Inspiring Teams**: Create an environment that supports and inspires team members, giving them the tools and resources they need to get their work done.
6. **Face-to-face communication**: The most effective and efficient communication is face-to-face communication, which can reduce misunderstandings and information loss.
7. **Working Software**: Continuous delivery of valuable software is the primary goal of the project.
8. **Continuous Progress**: Agile processes emphasize continuous progress to enable teams to quickly adapt to changes and create more value for customers.
9. **Technical Excellence**: Improve the quality and agility of software development through good design, sophisticated craftsmanship, and technical practices.
10. **Simplicity is essential**: Simplify the development process as much as possible and avoid unnecessary complexity to improve production efficiency.
11. **Self-Organization**: Encourage team members to self-organize and let them decide how to complete their work to increase creativity and efficiency.
12. **Reflection and Adjustment**: Regularly reflect on the way the team works and optimize processes and efficiency through continuous improvement.

## Agile development framework

Many people have heard of **Scrum Master,**oh, I am curious what is Scrum Master?

**Scrum is an iterative and incremental software development process**


🔥 Sprint is an important part of Scrum. Sprint can be understood as an iteration. A Spring usually lasts 2 to 4 weeks and cannot be extended or shortened. Generally, OpenIM is based on two weeks and four weeks (biweekly meeting time period)

Scrum is a term used in rugby. The normal translation is to mean scrambling for the ball. It is now quoted in agile practices and represents an agile framework. Scrum is not a specific product development process or technology, but a framework that accommodates other processes and technologies. It is an iterative and incremental product development framework! Generally speaking, Scrum is a full-process framework composed of 3355 principles. The so-called 5533 values are the 3 artifacts, 3 roles, 5 meetings and 5 values in Scrum.

| Scrum Principles | Description |
| ---------- | --------------------------------------- -------------------------- |
| 3 types of artifacts | - Product Backlog: Contains all features, requirements, optimization and repair tasks to be developed. |
| | - Sprint Backlog: A subset of the product backlog selected in the sprint, representing the team's work. |
| | - Increment: The sum of all product backlog items completed in a sprint, which is a complete product version. |
| 3 roles | - Scrum Master: Responsible for guiding the team to practice Scrum, solving obstacles, and ensuring efficient work. |
| | - Product Owner PO (Product Owner): Represents stakeholders, manages product backlog items, and provides feedback. |
| | - Development Team: Responsible for actual development work, self-organized and cross-functional. Responsible for getting the work done by the end of the Sprint. |
| 5 meetings | - Sprint Planning Meeting: Plan the work to be completed in the next sprint. |
| | - Daily Scrum: Report progress, discuss issues and plan next steps. |
| | - Sprint Review Meeting: Present sprint results and receive feedback from stakeholders. |
| | - Sprint Retrospective Meeting: Introspect and improve the process. |
| | - Product Backlog Refinement Meeting: Refine product backlog items. |
| 5 Values | - Commitment: A mutual commitment to complete the work during the sprint planning meeting. |
| | - Courage: Maintain courage in the face of challenges and difficulties. |
| | - Focus: Focus on the current sprint goal. |
| | - Openness: Maintain open communication and transparency. |
| | - Respect: Mutual respect, reasonUnderstand differences and support team development. |

**Here I want to talk about OpenIM’s Owner culture:**

**Owner Culture**. This is very important, but this does not mean that if a thing does not have an owner, it will be like the "Three Monks", and the matter will reach the point where no one cares. This is because many people are relatively nice at work, and nice people are usually embarrassed to jump out and give orders to others. Therefore, Owner culture requires that an Owner be defined for everything, and this Owner has the right to give orders to others, and others are obliged to cooperate with him. Of course, the greater the power of the Owner, the greater the responsibility!



## Agile VS DevOps

We talked about Agile and DevOps, so what kind of sparks will be produced if TM collides?

🔥 I think DevOps can be seen as an extension of agile thinking from the development end to the system maintenance end

- Agilely resolve customer and IT department issues and conflicts.
- DevOps: Resolve conflicts within IT, between development and operations.

Therefore, Agile and DevOps should complement each other and jointly create high-quality teams.

| Four Core Values of the Agile Manifesto | Explanation |
| ---------------------------------- | --------------- -------------------------------------------------- |
| Individuals and interactions trump processes and tools | Emphasis on communication and cooperation among team members, believing that effective interaction between people is more important than cumbersome processes and tools. |
| Working software is better than comprehensive documentation | Pay attention to the actual running effect of the software, emphasizing that executable code and actually usable products are more valuable than excessive documents and specifications. |
| Customer cooperation trumps contract negotiation | Emphasis on active cooperative relationships with customers, believing that interaction with customers and understanding customer needs are more conducive to project success than strict contract negotiations. |
| Responding to changes rather than following a plan | Accept that changes in needs and circumstances are inevitable, and it is more valuable to respond quickly and flexibly to changes than to strictly follow a plan. |

| Three approaches to DevOps | Explanation |
|---------------- |-------------------------------- ---------------------------- |
| Collaboration and communication | DevOps emphasizes close collaboration and effective communication between software development and operation and maintenance teams. By eliminating information silos and facilitating communication, team members are better able to understand each other's work and needs, thereby increasing overall effectiveness. |
| Automation | Automation is one of the core principles of DevOps. Automation through tools and scripts can reduce manual operations and potential errors, thereby improving delivery speed and quality. Automated testing, deployment, monitoring and other aspects are all important components of DevOps automation. |
| Continuous Delivery | Continuous delivery is one of the goals of DevOps, which means continuously delivering software to the production environment to achieve rapid and stable releases. With practices such as continuous integration, continuous deployment, and automated testing, teams can respond more quickly to requirements changes and problem fixes. |

[Continuous Integration](https://learn.microsoft.com/zh-cn/devops/develop/what-is-continuous-integration) and [Continuous Delivery](https://learn.microsoft.com/zh-cn /devops/deliver/what-is-continuous-delivery) (CI/CD) Set up your team for the fast pace of agile development. Automate your build, test, and deployment pipelines as quickly as possible. Set up automation as one of the first tasks your team tackles when starting a new project.

With automation, teams can avoid the slow, error-prone, and time-consuming manual deployment process. Since the team releases each sprint, there is no need to perform these tasks manually.

CI/CD also affects software architecture. It ensures the delivery of buildable and deployable software. When teams implement hard-to-deploy functionality, they know immediately if build and deployment fail. CI/CD forces teams to resolve deployment issues. The product is then always ready for delivery.

There are a few key CI/CD activities that are essential for effective agile development.

1. **Unit testing. ** Unit testing is the first defense against human error. Consider unit testing as part of coding. Use code inspection tests. Make unit testing part of every build. Failed unit tests mean the build failed.
2. **Generate automation. ** The build system should pull code and tests directly from source control at build runtime.
3. **Branching and generation strategies. ** Configure branching and build strategies to automatically build when the team checks code into a specific branch.
4. **Deploy to the environment. ** Set up a release pipeline that automatically deploys the generated project to a simulated production environment.

## Lean theoretical system knowledge

While I was learning and writing, I was supplementing. I felt a little unsure about the **Lean Theory System** because the system was too huge and the individual seemed too small.

Maybe more needs to be practiced to gain insights, and everyone's insights are different. The lean production system is difficult to express clearly in words. If you want to learn the formless magic skill of doing whatever you want, you have to cross the river by feeling the stones. As the saying goes, one step at a time, haste makes waste.

🔥 Lean thinking is the integration of people, process and technology

- **Precisely define the value of a specific product;**
- **Identify the value stream of each product;**
- **Enable uninterrupted flow of value;**
- **Let customers drive the value stream of producers;**
- **Always pursue perfection. **



### Lean and DevOps

The essence of lean: achieving product value delivery with high quality and low cost

DevOps Core Principles: Deliver working software quickly to achieve expected value gains

**Think of DevOps as a successful lean management practice**

## Project management tools

| Product name | Product introduction | Official website address | Open source address | Advantages and disadvantages |
| ------- | ------------------------------------------ ------------------ | ---------------------------------- --------- | ---------------------------------- | ----- -------------------------------------------------- ----- |
| Trello | Trello is a simple and intuitive project management tool that organizes tasks and projects in the form of a Kanban board. Supports adding cards, lists and members, suitable for individuals and small teams. | https://trello.com/ | No open source | Advantages: easy to use, intuitive and concise. Disadvantages: The function is relatively simple and suitable for small projects. |
| Jira | Jira is a powerful project management and issue tracking tool, especially suitable for large software development teams. Supports agile development, defect management, task allocation and other functions. | https://www.atlassian.com/software/jira | No open source | Advantages: Comprehensive functions, suitable for complex projects. Disadvantages: The learning curve is steep and the interface is relatively complex. |
| Asana | Asana is a team collaboration tool that combines task management, calendaring, and project tracking. Suitable for coordinating team members and tracking project progress. | https://asana.com/ | No open source | Advantages: Simple and intuitive, suitable for small and medium-sized teams. Cons: Premium features require a paid subscription. |
| Redmine | Redmine is an open source project management and issue tracking tool that supports multi-project management, Gantt charts, custom workflows and other functions. | https://www.redmine.org/ | https://github.com/redmine/redmine | Advantages: Open source, free, and extensible. Disadvantages: The interface design is older and requires certain technical knowledge to deploy and configure. |
| ClickUp | ClickUp is a project management tool that integrates task management, document sharing, calendar planning and other functions. Suitable for individual and team use. | https://clickup.com/ | No open source | Advantages: comprehensive functions and beautiful interface. Disadvantages: The free version has limited features, and advanced features require payment. |