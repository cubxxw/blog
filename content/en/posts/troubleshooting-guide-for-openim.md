---
title: 'Troubleshooting Guide for OpenIM'
ShowRssButtonInSectionTermList: true
date: 2024-04-16T01:21:13+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ['OpenIM', 'Troubleshooting', 'Debugging', 'Tech Support', 'Software Development']
tags:
  - blog
  - openim
  - troubleshooting
  - debugging
  - tech support
categories:
  - Development
description: >
    This guide provides a comprehensive overview of troubleshooting methods and debugging techniques for OpenIM, drawing on real-world development and operational experiences. Ideal for developers looking to enhance their problem-solving skills in OpenIM environments.
---

### Translation and Enhancement of the Article on Troubleshooting Techniques Using OpenIM

If you're seeking specific answers to issues related to OpenIM, I regret to inform you that this article isn't a collection of problems and solutions. Instead, it focuses on the troubleshooting methods and debugging techniques gleaned from development and operational experiences using OpenIM as a case study. If you're interested in learning how to diagnose faults and pinpoint issues, please continue reading.

I will summarize some common situations I encounter in my work into categories for analysis.

Interestingly, while most people dread encountering bugs, I find them exciting. We spend more time reading and maintaining code than writing it. Thus, thinking critically about bugs is crucial, particularly as it helps us consider the scalability and error handling of our code to ensure its robustness.

## Basic Concepts of Troubleshooting

Troubleshooting can be broken down into several scenarios: compilation issues, startup issues, and operational service faults. The approach to diagnosing these scenarios is generally similar.

The troubleshooting process begins with identifying the problem, followed by pinpointing its cause. This might require multiple rounds of analysis to identify the root cause, leading to a resolution. The process is illustrated below:

```plaintext
Start
  |
  V
Identify Issue ------> Record symptoms and relevant conditions
  |
  V
Locate Issue
  |
  V
Preliminary Analysis --------> Determine possible causes
  |                            |
  V                            |
Deep Analysis Needed? -----> Yes ------> Conduct In-depth Analysis
  |                            |             |
  |                            |             V
  |                            |          Identify specific cause
  |                            |             |
  |                            |             V
  |                            <-------- Root cause found?
  |                               |
  |                               No
  |
  V
Issue Resolved?
  |
  Yes ------> Document the resolution process and solutions
  |
  |
  No ------> Adjust strategy or seek help
  |
  V
End
```

To troubleshoot and solve problems, you need two basic skills:

- Ability to find and understand component logs;
- Ability to devise solutions based on error logs.

### Identifying the Issue

Identifying the issue is the first step in troubleshooting. We typically use several methods to uncover issues:

- **Code Review:** Conducting code reviews during development can reveal coding errors and potential bugs.
- **Security Audits:** Security audits can detect vulnerabilities and risks in software or systems.
- **Service Status Checks:** Checking the operational status of services can help identify issues. For example, if deploying openim in linux-system mode, checking the status of the openim-api service with `systemctl status openim-api` after startup may reveal that it failed to start, indicated by a status other than `active (running)`.
- **Testing:** Various types of testing, such as unit tests, integration tests, and system tests, can uncover issues within software or systems.
- **Automated Testing:** Running automated tests can quickly identify problems.
- **Log Analysis:** Investigating logs during service or interface failures can reveal critical error logs marked by `WARN`, `ERROR`, `PANIC`, `FATAL`, etc.
- **Monitoring and Alerts:** Monitoring metrics and setting alerts can also help detect issues. Monitoring can reveal potential issues that logs might miss.
- **User Feedback:** After releasing a product or feature, users may encounter problems and report them to developers.

The methods for identifying issues vary and often depend on the specific software development phase. For example, during testing, issues might be identified by the quality assurance team. After product release, user feedback can be a source of valuable insights.

During development, common methods for identifying issues include: **self-testing by developers** -> **logs** -> **monitoring**. Next, I will detail how to troubleshoot during the development phase.

### Locating the Issue

After identifying an issue, the next step is to pinpoint the root cause. During development, you can locate issues through the following methods:

- **Reviewing Logs:** This is the simplest troubleshooting method, which requires proper log handling in the code.
- **Using the Go Debugging Tool, Delve:** This tool can help pinpoint issues more precisely.
- **Adding Debug Logs:** Starting from the program entry point, follow the code flow and add debug logs at key points to help locate the issue.

In the troubleshooting process, think of it as "following the vine to find the melon." For instance, if your program's execution flow is `A -> B -> ... -> M -> N`, with A, B, and N serving as checkpoints. These are points in the program where you need to locate issues, and they might be where the root causes lie.

During the troubleshooting process, you can trace back from a higher-level error log at point N to the previous checkpoint M. If M shows no issues, continue tracing back through the execution flow to find the source of the problem. Repeat this until you find the ultimate checkpoint, such as point B, which is

 the bug point. The execution flow is illustrated below:

```plaintext
+----+     +----+                +----+     +----+
| A  | --> | B  | --> ... --> | M  | --> | N  |
+----+     +----+                +----+     +----+
  ^          ^                             |
  |          |                             |
  +----------+-----------------------------+
     Trace back and investigate each level until the source is found

--------------------------------------------------
Flow Explanation:
1. Start at the error reporting checkpoint N.
2. If checkpoint N checks out fine, trace back to the previous checkpoint M.
3. Repeat step 2 until the source of the issue, such as checkpoint B, is found.
4. Once located at checkpoint B, address the specific issue causing the error.
```

**Locating Issues Through Logs:**

Initially, you should use logs to locate issues, as this is the simplest and most effective method. To do this, you need to know where component logs are saved, typically in standard output or a specific log file. Not only should you know how to read logs, but you also need to understand the reasons behind error logs.

Here are the steps to locate issues using this method:

**Step One: Ensure the Service is Running Normally**

If you installed OpenIM using source code or containers, in the project root directory, you can use:

```bash
make check
```

to verify whether OpenIM services have started properly.

If you deployed OpenIM using the linux system method, similarly, you can use:

```bash
systemctl status openim-api
```

to check whether the OpenIM API component is running properly.

If you see that `Active` is not `active (running)`, indicating that the openim-api service did not start normally, you can derive the following information from the output `Process: 1092 ExecStart=/opt/openim/bin/openim-api --config=/opt/openim/etc/oopenim-api.yaml (code=exited, status=1/FAILURE)`:

- The command to start the openim-api service is `/opt/openim/bin/openim-api --config=/opt/openim/etc/oopenim-api.yaml`.
- The configuration file loaded by `/opt/openim/bin/openim-api` is `/opt/openim/etc/oopenim-api.yaml`.
- The `/opt/openim/bin/openim-api` command failed with an exit code of `1` and a process ID of `1092`.

Note that `systemctl status` may truncate lines longer than a certain length with ellipses. To view the complete information, you can append the -l parameter, i.e., `systemctl status openim-api -l`.

Since the `openim-api` command failed to start, you need to check the logs from when `openim-api` was starting to see if there are any error logs.

Next, enter **Step Two: Check the Openim-api Running Logs.**

How do you check the logs? There are 3 methods, listed below in order of priority. You can choose one based on priority when locating issues and checking logs, where 1 > 2 > 3.

1. Use `journalctl -u openim-api` to check.
2. Check the openim-api log files.
3. Check through the console.

Below, I will introduce these three methods.

Let's start with the highest priority method, using `journalctl -u openim-api`.

Systemd offers its own logging system called journal. You can use the `journalctl` command to read journal logs. `journalctl` provides the `-u` option to view logs for a specific Unit and the `_PID` option to view logs for a specific process ID. From step one, we know the process ID of the failed service start is `1092`. Execute the following command to view the logs for this start:

```bash
journalctl -u openim-api
```

> You can also execute `journalctl _PID=1092`, which is equivalent to `journalctl -u openim-api`.
> 

From the logs above, we found the reason for the service start failure: openim-api encountered a Panic level error during startup: `panic: runtime error: invalid memory address or nil pointer dereference`. The code line causing the Panic is: `/home/colin/workspace/golang/src/github.com/openimsdk/open-im-server/pkg/*/*.go:*`. At this point, you have preliminarily located the cause of the issue.

Next, let's look at the method of checking through the openim-api log files.

As an enterprise-level IM open-source project, openim-api logs are certainly recorded in log files. From the output of `systemctl status openim-api` in step one, we know that the configuration file loaded by openim-api at startup is `/opt/openim/etc/openim-api.yaml`. Therefore, we can check the log file location specified in the `log.storageLocation

` configuration item in the `openim-api.yaml` file:

```yaml
###################### Log Configuration ######################
# Log configuration
#
# Storage directory
# Log rotation time
# Maximum number of logs to retain
# Log level, 6 means all levels
# Whether to output to stdout
# Whether to output in json format
# Whether to include stack trace in logs
log:
  storageLocation: ${LOG_STORAGE_LOCATION}
  rotationTime: ${LOG_ROTATION_TIME}
  remainRotationCount: ${LOG_REMAIN_ROTATION_COUNT}
  remainLogLevel: ${LOG_REMAIN_LOG_LEVEL}
  isStdout: ${LOG_IS_STDOUT}
  isJson: ${LOG_IS_JSON}
  withStack: ${LOG_WITH_STACK}
```

As you can see, openim-api records logs in the `${LOG_STORAGE_LOCATION}` file. Therefore, we can check the `${LOG_STORAGE_LOCATION}` log file to view the error messages.

Of course, you can also directly view the logs through the console, which requires running openim-api in the foreground of the Linux terminal (we already know the startup command from step one):

```bash
# /opt/openim/bin/openim-api --config=/opt/openim/etc/oopenim-api.yaml
2024/02/02 18:43:19 maxprocs: Leaving GOMAXPROCS=32: CPU quota undefined
panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: segmentation violation code=0x1 addr=0x0 pc=0x1de02f7]

goroutine 1 [running]:
......
```

Using these 3 methods, we can preliminarily locate the cause of the service exception.

Use the following command to view the status information for all openim components (target):

```bash
systemctl status openim.target
```

For more detailed linux system deployment methods, see https://github.com/openimsdk/open-im-server/blob/main/docs/contrib/install-openim-linux-system.md

If you're using Docker for deployment, then docker compose includes health checks. Simply use `docker ps` to view the container status, then use:

```bash
docker logs -f openim-server
```

to view the OpenIM startup logs for analysis.

**Using the Go Debugging Tool Delve to Locate Issues:**

Viewing logs is the simplest way to troubleshoot. By examining logs, we can often pinpoint the root cause of an issue, allowing for a quick resolution. However, in some cases, logs alone may not suffice to locate the issue. For example:

- The program crashes, but there are no error logs.
- Logs indicate an error, but only provide a general idea of the problem without pinpointing the root cause.

In these situations, we need to further pinpoint the issue. This is when we can use the Delve debugging tool to attempt to locate the problem. You can refer to a detailed guide on using Delve at https://nsddd.top/zh/posts/use-go-tools-dlv/

I've written a chapter on Delve usage in a previous blog, which you can read at the link provided above.

**Adding Debug Logs to Analyze and Troubleshoot Issues:**

If using the Delve tool still does not pinpoint the issue, you can try the most basic method next: adding debug logs to locate the problem. This method can be broken down into two steps.

**Step One: Add Debug Logs at Key Code Segments.**

You need to decide on the key code segments based on your understanding of the code. If you're unsure where the issue might be, start by adding debug logs at the request entry point, then follow the code flow step by step, adding debug logs as needed.

For example, through log analysis, we located the code causing the program to panic at `/home/colin/workspace/golang/src/github.com/openimsdk/open-im-server/pkg/*/*.go:*`.

When developing projects in Go and encountering a program crash (Panic), it's often due to an uninitialized variable or the use of a null pointer. In these cases, proper debugging and error handling can significantly improve your problem-solving efficiency. Here are the steps to effectively locate and resolve such issues, along with some key code examples:

**Step One: Locating the Issue**

Through the log file, you've already found the location of the problematic code, such as `/home/colin/workspace/golang/src/github.com/openimsdk/open-im-server/pkg/*/*.go:*`. Next, we need to verify if there's any use of null pointers, which is a common cause of Panic. To do this, you can add some debug code at the suspected problem area to check related variables.

Suppose you suspect the variable `o` is `nil`. You can add the following code before using `o` to confirm:

```go
if o == nil {
  log.Errorf("ERROR: 'o' is nil")
}

```

Additionally, adding error handling and debug

 logs is also a good practice. This not only helps you pinpoint the error location but also provides context for when the error occurs. For example, you can add debug logs in the error-handling code:

```go
if err != nil {
  log.Debugf("DEBUG POINT - 1: %v", err)
  return err
}
# systemctl status openim-api
```

This code records a debug log and returns an error when `err` is not null. By examining this log, you can more easily understand the circumstances under which the error occurred.

**Step Two: Recompile and Start the Program**

After adding the necessary debug code and error handling, you need to recompile the source code to ensure the changes take effect. If you want to compile only the openim-api component, use the following command:

```
make build BINS="openim-api"
```

After recompiling, run your program. Observe whether the program panics again and whether the logs provide new information to help further pinpoint the issue:

After adding the debug code, you can recompile and run the program again. After the program is running, continue checking the logs to see if the following log output appears:

```
Var o is nil

```

If it appears, it indicates that `o` was not initialized. If not, your assumption was incorrect, and you should continue with other debugging efforts. Here, after adding the debug logs, the log output includes the string `ERROR: 'o' is nil`, confirming that `o` was not initialized.

As you add debug logs, since they assist in pinpointing the issue, it indicates that these logs are useful. Therefore, you might consider retaining these debug log calls.

**Step Three: Fix the Code and Recompile, Start, and Test Again**

After identifying and resolving the error above, you can follow the development guidelines to compile, run, and test again. After the fix, re-run and check the status of the openim-api service:

```go
systemctl status openim-api
```

If it shows `Active: active (running)`, it indicates that the openim-api is running successfully, and the bug has been fixed.

**Code Demonstrations and Tips**

In Go project development, making effective use of logs is key to solving problems. Here's a simple function example to demonstrate how to add error handling and debug logs within a function:

```go
func loadData(o *DataObject) error {
  if o == nil {
    log.Errorf("loadData error: data object is nil")
    return fmt.Errorf("data object is nil")
  }

  // Assume there's complex data processing logic here
  err := processComplexData(o)
  if err != nil {
    log.Debugf("DEBUG POINT - 2: %v", err)
    return err
  }

  return nil
}

```

In this example, the `loadData` function takes a potentially `nil` data object pointer `o`. The function begins by checking if `o` is `nil` and logs an error and returns an error if it is `nil`. During data processing, if an error occurs, debug logs are recorded and the error is returned.

### Solving the Problem

Once the issue has been located, it's time to apply your understanding of the business and underlying code to fix it. The specifics of how to fix the problem will vary depending on the situation, and there's no one-size-fits-all approach, so further details are not provided here.

## Troubleshooting Compilation Issues

Troubleshooting compilation issues is relatively straightforward and clear.

OpenIM is built using the following command:

```go
make build
```

Failures at this stage are typically caused by two issues:

1. **Outdated Go Version**: The Go language version must meet a minimum standard to ensure the software can be built and run properly. We monitor the Go version in the Makefile using the `GO_MINIMUM_VERSION` variable and include a script segment to check if the current environment's Go version meets this requirement. If the version is too low, you will be prompted to install a newer version of Go.
2. **Network Errors Downloading Go Packages**: Downloading Go packages usually depends on the network environment. By default, it's recommended to use the official Go proxy (e.g., `https://proxy.golang.org`) to enhance the download speed and ensure security. However, in regions where connections to foreign servers are slow or unstable, the build process might hang due to slow package downloads. In such cases, it's advisable to set up a network proxy or use a domestic mirror source like Qiniu Cloud (`https://goproxy.cn`) or Alibaba Cloud (`https://mirrors.aliyun.com/goproxy/`), which offer faster access speeds and better availability.

## Troubleshooting Startup Issues

Let's consider an example of a startup error:

```go
root ▻ ◇┈◉ mysql -h127.

0.0.1 -uroot -p 'cubxxw
bash: /usr/bin/mysql: no such file or directory
```

To understand this error, we recognize that the mysql command was not found, indicating that mysql is not installed or the installation failed.

Thus, our solution is to re-execute the MariaDB installation steps:

```go
apt install mysql-client-core-8.0     # version 8.0.35-0ubuntu0.22.04.1,
```

## Troubleshooting Service Operation Issues

Troubleshooting errors during server operation is extremely challenging.

> When receiving an alarm about an online service, how should you respond correctly? When facing inexplicable performance issues, how can you pinpoint the RootCase? Diagnosing online issues is always difficult, but we can use established methodologies and tool chains to help us quickly locate problems.
> 

An alarm is an objective fact. Even if it's a false alarm, it indicates that some unexpected cases have occurred. We can't exhaust all possible issues, but we can establish standard processes and SOP manuals to break down the granularity of problems, simplify the difficulty, and more easily locate issues.

**Here's a basic process when encountering issues:**

- Don't panic; getting flustered under pressure often leads to mistakes and overlooks critical clues.
- Then, synchronize in the group that you've started intervening, keeping everyone informed of the progress.
- 80% of incidents are changes made on the same day (these could be code, environment, or configuration changes).
- For incidents, the first priority is to stop losses, even if it means disrupting the scene. If downgrading isn't an option, try restarting. If restarting doesn't work, roll back.
- Establish different SOPs from resource utilization to latency. When encountering problems, simply follow the steps in the SOP to resolve 90% of the issues. For unresolved issues, call for support from teammates and experts. Voice communication is the most effective, and you can track and record the issue afterwards.

Establish a robust SOP, build organizational strength, and avoid relying solely on individual efforts. With a comprehensive SOP, even a newcomer can quickly engage in online troubleshooting. Our documentation includes:

- Service Call Exception Troubleshooting SOP
- Response Latency Issue Troubleshooting SOP
- Circuit Breaker Issue Troubleshooting SOP
- MySQL Response RT Increase Troubleshooting SOP
- Redis Response RT Increase Troubleshooting SOP
- ES Response RT, Error Rate Increase Troubleshooting SOP
- Goroutine Spike Troubleshooting SOP
- Instance CPU, Memory Exception Troubleshooting SOP
- Traffic Increase Troubleshooting SOP
- Common Business Issue Troubleshooting

Due to internal sensitivity, the summary here is based on the above data. The handling manual should cover the following points:

- Include links to various tools, with service owners and infrastructure managers readily accessible, ensuring **no searching, no asking** is necessary.
- Equip tools like Grafana with well-designed dashboards. A good dashboard can intuitively pinpoint problematic APIs, showing latency at P99, 95, 90, QPS, traffic, and other monitoring metrics. The error rate is a key monitoring value, **latency is just a symptom, errors bring us closer to the truth**.
- Check if the corresponding service is alive? Are there any resource bottlenecks (e.g., maxed-out CPU)? Has the goroutine count exploded? If the entire suite has crashed, simply restart, which is likely due to unreleased resource connections. If restarting doesn't help, stop the bleeding.

- For infrastructure (Redis, MySQL, etc.) latency, check the current number of connections, the number of slow requests, hardware resources, etc. In "The Art of Capacity Planning," the **USE** model (utilization, saturation, errors) is a great starting point. For all resources, check their usage rate, saturation, and errors.
- If only some interfaces are slow, directly limit the rate to prevent cascading failures, and capture a request to examine the tracing and see the timing of the chain.

**How to Troubleshoot High CPU Usage**

High CPU usage is a common issue in server-side development, potentially leading to performance degradation, increased response times, and even service crashes. For services developed in Go, we can use a series of tools and techniques to diagnose and resolve these issues. Here are the general steps for troubleshooting high CPU usage:

**1. Collect Performance Profiling Data**

First, you need to use the **`pprof`** tool from the Go language's standard library to collect and analyze performance data. **`pprof`** provides interfaces for viewing and analyzing performance-related data.

- **Start CPU Profiling:** Import the **`net/http/pprof`** module in your service and ensure your program can access these profiling endpoints via HTTP while running. Then, use the following command to start collecting CPU profiling data:
    
    ```bash
    go tool p

prof http://<your-service-address>:<port>/debug/pprof/profile?seconds=30
    ```
    
    This command triggers 30 seconds of CPU profiling on the server, collecting CPU usage data during this period. The **`seconds`** parameter can be adjusted as needed to collect longer or shorter data.
    

**2. Analyze CPU Profiling Data**

After collecting the CPU profiling data, use the **`go tool pprof`** to analyze this data. This can help identify the causes of high CPU usage:

- **Open the Profiling File:** Load the profiling file using **`go tool pprof`**. You can access it via the URL generated in the previous step or directly load the saved profiling file.
- **View Hotspot Functions:** In the **`pprof`** interactive command line, use the **`top`** command to view the functions that consume the most CPU. This will help you identify which functions are using the most CPU resources.
    
    ```bash
    top
    ```
    
- **Generate Flame Graphs:** Flame graphs provide a visual way to view the contribution of various functions to CPU usage. In the **`pprof`** tool, use the **`web`** command to generate a flame graph, which requires graphical interface support:
    
    ```bash
    web
    ```
    

**3. Optimize Code**

Based on the **`pprof`** analysis results, once you've identified the code segments with high CPU usage, you can further analyze their logic and performance bottlenecks. Possible optimization measures include:

- **Optimize Algorithms and Data Structures:** Use more efficient algorithms or data structures to reduce computational complexity.
- **Reduce Lock Usage:** Check for unnecessary lock contention and try to reduce the scope of locks or use more efficient concurrency control methods.
- **Asynchronous Processing:** For IO-intensive operations, consider using asynchronous or non-blocking calls to reduce CPU load.

## Troubleshooting Automation in CICD

OpenIM extensively uses automation tools and methods, and to date, OpenIM's automation is very mature.

The primary CICD for OpenIM is based on GitHub Actions, accessible at https://github.com/openimsdk/open-im-server/actions

Selecting a few of the CICD error messages as examples, see: https://github.com/openimsdk/open-im-server/actions?query=is%3Afailure

For instance, consider an API test failure:

> The corresponding link is: [https://github.com/openimsdk/open-im-server/actions/runs/8687693217?pr=2148](https://github.com/openimsdk/open-im-server/actions/runs/8687693217?pr=2148)
> 

In CICD, there are many jobs. We can directly jump to the job where the error occurred.

Locating the error:

```go
[2024-04-15 10:41:04 UTC] Response from user registration: {"errCode":14,"errMsg":"error reading from server: EOF","errDlt":"14 error reading from server: EOF"}
!!! Error in /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:53 
  Error occurred: {"errCode":14,"errMsg":"error reading from server: EOF","errDlt":"14 error reading from server: EOF"}, You can read the error code in the API documentation https://docs.openim.io/restapi/errcode
Call stack:
  1: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:53 openim::test::check_error(...)
  2: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:705 openim::test::invite_user_to_group(...)
  3: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:1091 openim::test::group(...)
  4: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:1444 openim::test::api(...)
  5: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:1456 openim::test::test(...)
  6: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:1465 main(...)
Exiting with status 1
make[1]: *** [scripts/make-rules/golang.mk:200: go.test.api] Error 1
make: *** [Makefile:173: test-api] Error 2
===========> Run api test
{"errCode":1001,"errMsg":"ArgsError","errDlt":"header must have operationID: 1001 ArgsError"}
{"errCode":1001,"errMsg":"ArgsError","errDlt":"header must have token: 1001 ArgsError"}
User registration failed.
TODO: openim test man
***
Requesting force logout for user: {
  "platformID": 2,
  "userID

": "4950983283"
}
```

1. Reading Server Errors

Error message: **`{"errCode":14,"errMsg":"error reading from server: EOF","errDlt":"14 error reading from server: EOF"}`**

**Analysis**:

- **`EOF`** (End of File) errors indicate that the connection was unexpectedly closed while attempting to read data from the server.
- This could be caused by a crash on the server side or a network issue.

**Resolution**:

- **Check Server Status**: Ensure the server is running normally and has not crashed.
- **Network Connection**: Check if the network connection is stable, especially between the server and the testing client.
- **Server Logs**: Review the server logs for any errors or warnings that could have caused the connection to drop.

2. Parameter Errors

Error messages: **`{"errCode":1001,"errMsg":"ArgsError","errDlt":"header must have operationID: 1001 ArgsError"}`** and **`{"errCode":1001,"errMsg":"ArgsError","errDlt":"header must have token: 1001 ArgsError"}`**

**Analysis**:

- These errors indicate that essential parameters are missing from the request headers: **`operationID`** and **`token`**.
- According to the API documentation, these parameters are necessary for executing the request.

**Resolution**:

- **Check API Requests**: Review the code sections that build API requests to ensure all necessary header information is included.
- **Update Test Scripts**: If the scripts are found to be missing these parameters, update them to include the correct parameters.

**3. Script Errors**

Script error message: **`Error occurred: {"errCode":14,"errMsg":"error reading from server: EOF","errDlt":"14 error reading from server: EOF"}`**, with the call stack indicating errors from multiple locations within the **`test.sh`** file.

**Analysis**:

- Error indications are found in various function calls within the script, pointing to potential script logic or API call sequence issues.

**Resolution**:

- **Step-by-step Debugging**: Run each part of the script according to the order in the call stack, ensuring each step executes correctly.
- **Enhance Error Handling**: Improve the script's error handling logic to provide clearer error messages and recovery paths when API calls fail.

Detailed Analysis of API Test Failure:

**Reasons for API Test Failure**

1. **Code Errors**: The most direct cause might be errors in code logic or implementation. For instance, an API might not handle input data boundary conditions correctly, or its logic might not meet expectations.
2. **Environment Issues**: Inconsistencies between the test and production environments, or issues with some resources in the test environment (like databases or network connections), can cause tests to fail.
3. **Dependency Service Issues**: API tests often depend on external services or third-party libraries. If these services are unstable or updates cause incompatibilities, it can affect test results.
4. **Data Issues**: Inaccurate or non-representative test data can also lead to failures, especially in tests that handle complex data or state transitions.
5. **Configuration Errors**: Errors in configuration files or incorrect configuration steps in the CI/CD process, such as incorrect API keys or environment variable settings, can cause tests to fail.

**Troubleshooting Steps**

For the GitHub Actions API test failure example mentioned above, we can follow these steps to troubleshoot:

1. **View Logs and Reports**: First, review the detailed logs and test reports generated during the CI/CD process. This information usually provides direct reasons for the failure.
2. **Reproduce Locally**: Try to reproduce the issue in a local environment. This allows developers to debug and test more directly, eliminating environmental configuration or dependency issues.
3. **Verify Code and Logic**: Check the API's code implementation and logic processing to confirm if there are any errors at the code level.
4. **Check Configuration Files and Environmental Variables**: Ensure all configuration files and environmental variables are correctly set, especially those involving network, database connections, and external API calls.
5. **Communicate with the Team**: If the API test depends on work from other parts of the team, promptly communicate with relevant team members about potential issues and changes.

## Tools and Resources for Troubleshooting

The basic elements of reporting a bug include:

1. The expected result
2. The actual result
3. How to reproduce the issue

For open-source projects, having a unified entry point for searching issues is particularly important. For us, GitHub Issues is a high-level place to track issues, and GitHub Projects is a great place to summarize issues.

Don't overlook any bugs. It's important to manage, summarize, and learn from the bug handling process. Below is a template for summarizing:

```
-- Details
-- Disaster Response
-- Post-Mortem
    -- What went well
    -- What didn't go well
```



**Q1**

When a service experiences a `panic`, combining the stack trace information printed in the logs can easily pinpoint the erroneous code and make many possible conjectures. Then, combined with specific context information, the problem can be quickly reproduced. Throughout this process, logs are key to troubleshooting.

Logs must include the `panic` stack trace information, preferably with link tracing `trace_id` information. It's even better if there's a corresponding `Test` during development.

**Q2**

For slow interface responses, the `pprof` tool can be used for diagnosis. The most likely scenario is slow calls to external services, such as classic slow MySQL queries.

If external dependencies are ruled out, it's likely an issue with the program code itself. The various displays in `pprof` can also quickly locate the problem.

### pprof

pprof supports two different ways of integration and use:

1. **runtime/pprof**:
    - This method is mainly used for long-running services and can be embedded within the service.
    - It allows developers to capture performance data during runtime, completing sampling automatically after the program ends.
    - Example code:
        
        ```go
        import "runtime/pprof"
        import "os"
        
        func main() {
            f, err := os.Create("cpu.prof")
            if err != nil {
                log.Fatal("could not create CPU profile: ", err)
            }
            if err := pprof.StartCPUProfile(f); err != nil {
                log.Fatal("could not start CPU profile: ", err)
            }
            defer pprof.StopCPUProfile()
        
            // Your program code
        }
        
        ```
        
2. **net/http/pprof**:
    - Provides an HTTP Handler interface, which can be used to start and stop performance profiling via HTTP requests during runtime.
    - This method is very flexible, suitable for starting or stopping Profiling at any time.
    - Example code:
        
        ```go
        import (
            "net/http"
            _ "net/http/pprof"
        )
        
        func main() {
            http.ListenAndServe(":8080", nil)
        }
        
        ```
        

**Supported Profiling Types**

- **CPU Profiling**: Captures CPU usage during program execution, helping to identify CPU hotspots.
- **Memory Profiling**: Tracks memory allocation, identifying memory leaks or frequently allocated spots.
- **Support for Benchmark Profiling**: Generates performance analysis files while running Go Benchmarks:
    
    ```bash
    go test -bench . -cpuprofile=cpu.prof
    ```
    

**How to Interpret Profiling Results**

- **cum** (cumulative time): Displays the total overhead of the current function and its callers.
- **flat** (current function overhead): Shows the overhead of the function itself.

It's generally recommended to first look at the **`cum`** value, because if a function calls several other functions or is called multiple times, its **`flat`** value might seem unusually high. However, the **`cum`** value can give you a more comprehensive view, and it's often here that problem code can be identified.

**Example Analysis**

Suppose you have a profiling file named **`cpu.prof`**. You can start the pprof interactive interface using the command **`go tool pprof cpu.prof`**. Here's how to do it:

1. Run in the command line:
    
    ```bash
    go tool pprof cpu.prof
    ```
    
2. In the pprof tool, use the **`top`** command to view the functions that consume the most CPU:
    
    ```bash
    (pprof) top
    ```
    

### trace

When runtime bottlenecks occur, such as delayed goroutine scheduling or excessive GC STW, trace can help us view runtime details. The command `curl host/debug/pprof/trace?seconds=10 > trace.out` generates data within 10 seconds. Then, using `go tool trace trace.out`, we might need to wait a while if the data volume is large. This opens a new tab in the browser with very useful information.

We can understand how our program ran during this period through view trace. Just enter and you'll see the following interface, where you can use WSAD for zooming. Here, we can see the time taken by GC, the impact of STW, the function call stack, and goroutine scheduling.

### Goroutine Visualization

Additionally, we can visualize the runtime relationships of goroutines using [divan/gotrace](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fdivan%2Fgotrace). Visualizing goroutines is not only interesting but extremely informative.

**How to Use gotrace**

1. **Install gotrace**:
To use gotrace, you first need to install it in your development environment. gotrace can be installed using

 Go's package management tool:
    
    ```bash
    go get -u github.com/divan/gotrace
    ```
    
2. **Compile Your Go Program**:
Compile your program using the **`go build`** command. Make sure to enable the race detector so gotrace can track all necessary runtime information:
    
    ```bash
    go build -race
    # When we use make build, it's actually the smallest image size, you need to enable debug mode
    # make build BINS="openim-api" DEBUG=1
    ```
    
3. **Run gotrace**:
Run gotrace and direct it to your executable. gotrace will analyze the program's execution and generate a visualization report containing all goroutine activities:
    
    ```bash
    gotrace ./your_program
    ```
    
    This command launches your application and captures goroutine behavior data during its execution.
    
4. **View the Results**:
gotrace generates an HTML file that you can open in a browser to view the activities of the goroutines. This visualization report includes the lifecycle of each goroutine, their interactions, and other key events.

**Benefits of gotrace**

- **Concurrency Behavior Visualization**: By visually displaying it, gotrace makes complex concurrency behavior straightforward, helping developers understand how various goroutines interact.
- **Diagnosing Performance Issues**: It can help diagnose concurrency issues like deadlocks and race conditions.
- **Improving Program Design**: Observing goroutine behavior can help developers better design the concurrency structure of their programs, optimizing performance and resource use.

**Example View**

The report generated by gotrace typically contains timelines for multiple goroutines, showing different states (such as running, waiting, sleeping, etc.) of each goroutine and their interactions. These visualizations greatly simplify the complexity of concurrent programming, especially when dealing with a large number of goroutines.

Overall, gotrace is an incredibly useful tool that not only helps developers find and resolve concurrency issues but also helps optimize overall program performance. If you're developing a Go program involving complex concurrency, I highly recommend trying gotrace.

### perf

Sometimes pprof might fail, such as when the application hangs. For example, when scheduling is maxed out (preemptive scheduling has solved this problem). For instance, we can see the most time-consuming symbols through perf top (Go compiles with symbol tables embedded, no manual injection required).

### Swiss Army Knife

[Brendan Gregg](https://link.juejin.cn/?target=https%3A%2F%2Fwww.brendangregg.com%2Flinuxperf.html) created a performance guide known as the Swiss Army Knife. When suspecting OS issues, we can use the corresponding tools as illustrated. Of course, the most effective approach is to call on IT support experts to assist.

### Performance Optimization Considerations

Performance issues often stem from multiple factors. They might have only recently appeared even if you haven't made any changes; they might occur sporadically; or they might only appear on certain machines. **We should conduct thorough benchmarking. Any optimization should be based on baseline comparisons, as numbers provide the most direct insight.** Application layer and underlying logic are often completely different, and we should consider them separately.

## Summary

In this article, I introduced the approach and methods for troubleshooting logs: identify the problem -> locate the problem -> solve the problem. During the development phase, the main method to identify problems is through testing + logs, and an effective way to locate problems is to start from the error in the logs and trace back through the program execution flow to find where the error occurred. Once the root cause is identified, it's time to resolve the issue. You'll need to rely on your understanding of the business and the underlying code implementation to solve the problem.

We often face many strange issues and different challenges. Since we can't control the outbreak of problems, we can use tools like Golangci-lint and CodeReview to avoid potential problems, reducing the frequency and impact of incidents. Most problems are either too simple to be anticipated or too complex to be discovered. Keeping the code simple and adhering to the KISS principle is a timeless viewpoint.

Fixing a problem is not just an endpoint but the start of everything. Behind every serious accident, there are inevitably 29 minor accidents, 300 near-misses, and 1000 potential hazards. Conducting thorough reviews and making improvements are the most valuable lessons we can learn from accidents.

Finally, if you are particularly interested in performance optimization, you should not miss the book [The Art of Capacity Planning](https://link.juejin.cn/?target=https%3A%2F%2Fbook.douban.com%2Fsubject%2F26586598%2F).

## References

- chatgpt4
- [pprof - The Go Programming Language](https://link.juejin.cn/?target=https%3A%2F%2Fgolang.org%2Fpkg

%2Fnet%2Fhttp%2Fpprof%2F)
- [Visualizing Concurrency in Go · divan’s blog](https://link.juejin.cn/?target=https%3A%2F%2Fdivan.github.io%2Fposts%2Fgo_concurrency_visualize%2F)
- [QQ Music Go pprof Practical Use](https://link.juejin.cn/?target=https%3A%2F%2Fwemp.app%2Fposts%2Fb4f1a37c-239d-4561-a4d6-0bbeb0c6e43f)
- [Locating and Troubleshooting Memory Leaks: Heap Profiling Principles](https://link.juejin.cn/?target=https%3A%2F%2Fmp.weixin.qq.com%2Fs%2FvncOjgrSomLx5je-ywD5Ng)
- [Shimo Document WebSocket Million Long Connections Technical Practice](https://link.juejin.cn/?target=https%3A%2F%2Fmp.weixin.qq.com%2Fs%2FMUourpb0IqqFo5XlxRLE0w)
- [Online Problem Diagnosis and Localization in Large Systems](https://link.juejin.cn/?target=https%3A%2F%2Fxargin.com%2Fcontinuous-profiling%2F)
- [Performance Optimization in Go Applications](https://link.juejin.cn/?target=https%3A%2F%2Fwww.xargin.com%2Fgo-perf-optimization%2F)
- [Go Runtime Related Problems in TiDB Production Environment](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fgopherchina%2Fconference%2Fblob%2Fmaster%2F2020%2F2.1.4%2520PingCAP-Go%2520runtime%2520related%2520problems%2520in%2520TiDB%2520production%2520environment.pdf)
- [www.brendangregg.com/blog/2017-0…](https://link.juejin.cn/?target=https%3A%2F%2Fwww.brendangregg.com%2Fblog%2F2017-01-31%2Fgolang-bcc-bpf-function-tracing.html)
