---
title: 'Openim Multi Process Management'
description:
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-09-16T15:55:38+08:00
draft : false
showtoc: true
tocopen: false
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
  - en
categories:
  - Development
---

## 111: OpenIM multi-process management strategy

## Main modules

This article will start from the most basic single-process foreground operation of OpenIM, to the nohup background operation, to the system system process, and then to Supervisord, container management, and kubernetes health detection.



## Current issues

Read: https://github.com/cubxxw/Open-IM-Server/blob/refactor/feat-enhance/scripts/install/openim-crontask.sh source code

The current process management strategy before OpenIM is started in the background through `nohup`.

The entire project is run by multiple processes, and now a reliable keep-alive mechanism is needed to quickly pull it up when the process crashes. Openim's solution is nothing more than to write a keep-alive script that runs in the background. If a process is found to be closed, the script will pull it up, or through the docker compose health detection mechanism:

```bash
healthcheck:
   test: ["CMD-SHELL", "./scripts/check-all.sh"]
   interval: 30s
   timeout: 10s
   retries: 5
```

But what if the script hangs on its own? (You can’t use scripts to continue to keep alive, right?). In addition, another way is to configure a service and let the `Linux` operating system help you daemonize the process. Obviously, this method does not need to worry about the daemon process dying on its own. After all, `systemd` will help you protect it. If it dies, No more, the operating system should be gone too.

We can adapt to the general Ubuntu and CentOS, because other operating systems such as `alpine` and Alpine Linux do not use `systemd` as their default initialization system. Instead, Alpine Linux uses `OpenRC` as its default init system. This is also the reason why many people choose Alpine Linux, because it is lightweight and does not introduce `systemd`.

Now the new version of Ubuntu and CentOS are supported. The old version of `linux` uses `service httpd start` to start the service. The new version of `linux` uses `systemctl start httpd` to start the service. In addition, `initd` is used as the operating system to initialize the system. To add a service, add a script in `/etc/init.d/`. For operating systems that use `systemd` as the initialization system, you only need to add a configuration file in the `/etc/systemd/system/` folder.



## Foreground process

Foreground process: It is a command that runs in the terminal. Then the terminal is the control terminal of the process. Once the terminal is closed, the process disappears. At this time, the Shell is occupied and we cannot perform other operations. For those processes that are not interactive, we want to start them in the background. We can add an '&' to the startup parameters to achieve this purpose.

Background process: Also called daemon, it is a special process that runs in the background and is not controlled by the terminal. It does not require terminal interaction; most servers in Linux are implemented using daemon processes. For example, httpd of web server, etc.


### solution

**1. Use & run programs in the background: **

The results will be output to the terminal

+ Use Ctrl + C to send SIGINT signal, the program is **immune**

+ Close the session and send the SIGHUP signal, and the program **closes**

**2. Use nohup to run the program:**

The results will be output to nohup.out by default

+ Use Ctrl + C to send the SIGINT signal and the program **closes**

+ Close the session and send the SIGHUP signal, the program is **immune**

Therefore, nohup and & are often used online to start the program: **can be immune to SIGINT and SIGHUP signals at the same time**

**3. Systemctl：**

Systemctl is a systemd tool, mainly responsible for controlling the systemd system and service manager.

Enter `ps ax | grep systemd` in the terminal and see the first line. The number 1 in it means that its process number is 1, which means that it is the first program launched by the Linux kernel. Therefore, once the kernel has detected the hardware and organized the memory, it will run the `/usr/lib/systemd/systemd` executable, which will launch other programs in sequence. (In the days before Systemd, the kernel would run `/sbin/init`, which would then run the rest of the various startup scripts in a system called SysVinit.)



## System

Explain in detail the very important part of Linux system

+ Reference article: https://blog.51cto.com/babylater/1895056

### Unit

There are many things that need to be done during system initialization. Background services need to be started, such as starting the SSHD service; configuration work needs to be done, such as mounting the file system. Each step in this process is abstracted by systemd into a configuration unit, that is, unit. You can think of a service as a configuration unit; a mount point as a configuration unit; the configuration of a swap partition as a configuration unit; and so on. systemd classifies hives into some different types: However, systemd is evolving rapidly and new features are being added all the time. So hive types may continue to increase in the near future.

1. service: represents a background service process, such as mysqld. This is the most commonly used category.

2. socket: This type of hive encapsulates a socket in the system and the Internet. Currently, systemd supports AF_INET, AF_INET6, and AF_UNIX sockets for streaming, datagram, and continuous packets. Every socket hive has a corresponding service hive. The corresponding service will be started when the first "connection" enters the socket (for example: nscd.socket starts nscd.service after a new connection).

3. device: This type of hive encapsulates a device that exists in the Linux device tree. Every device tagged with a udev rule will appear in systemd as a device hive.

4. mount: This type of hive encapsulates a mount point in the file system structure hierarchy. Systemd will monitor and manage this mount point. For example, it can be automatically mounted at startup; it can be automatically uninstalled under certain conditions. Systemd will convert entries in `/etc/fstab` into mount points and process them at boot.

5. automount: This type of hive encapsulates a self-mount point in the system structure hierarchy. Each self-mounting hive corresponds to a mounting hive. When the automatic mount point is accessed, systemd executes the mounting behavior defined in the mount point.

6. swap: Similar to the mount hive, the swap hive is used to manage the swap partition. Users can use swap hives to define swap partitions in the system, allowing these swap partitions to be activated at boot time.

7. Target: This type of hive is a logical grouping of other hives. They don't actually do anything themselves, they just reference other hives. This allows for unified control of the configuration unit. This enables the familiar concept of run levels to be implemented. For example, if you want the system to enter graphical mode, you need to run many services and configuration commands. These operations are represented by configuration units one by one. Combining all these configuration units into a target means that all these configuration units need to be executed. Once to enter the system running state represented by the target. (Example: multi-user.target is equivalent to runlevel 5 on legacy systems using SysV)

8. timer: The timer configuration unit is used to trigger user-defined operations at regular intervals. This type of configuration unit replaces traditional timing services such as atd and crond.


Each configuration unit has a corresponding configuration file. The task of the system administrator is to write and maintain these different configuration files. For example, a MySQL service corresponds to a `mysql.service` file. The syntax of this configuration file is very simple, and users no longer need to write and maintain complex System 5 scripts.



### Dependencies

Although systemd removes the dependency on a large amount of startup work, allowing them to be started concurrently. However, there are still some tasks that have inherent dependencies between them, and the three major methods of "socket activation" (socket activation), D-Bus activation and autofs cannot be used to relieve the dependence (see the subsequent descriptions for details of the three major methods). For example: the mount must wait for the mount point to be created in the file system; the mount must also wait for the corresponding physical device to be ready. In order to solve this kind of dependency problem, systemd hives can define dependencies on each other.

Systemd uses keywords in hive definition files to describe dependencies between hives. For example: unit A depends on unit B, which can be represented by "require A" in the definition of unit B. In this way, systemd will ensure that A is started first and then B.



### Systemd’s concurrent startup principle

As mentioned before, in Systemd, all services are started concurrently, such as Avahi, D-Bus, livirtd, X11, and HAL can be started at the same time. At first glance, this seems to be a bit of a problem. For example, Avahi needs the syslog service. Avahi and syslog are started at the same time. Assuming that Avahi starts faster, syslog is not ready yet, but Avahi needs to record logs. Wouldn't this cause problems? ?



## The use of Systemd

Developers need to know more details about systemd. For example, if you plan to develop a new system service, you must understand how to make this service manageable by systemd. This requires you to pay attention to the following points:

1. The background service process code does not need to execute two forks to implement the background wizard process. It only needs to implement the main loop of the service itself.

2. Do not call setsid(), leave it to systemd.

3. No need to maintain pid files anymore.

4. Systemd provides a logging function. The service process only needs to output to stderr without using syslog.

5. Handle the signal SIGTERM. The only correct function of this signal is to stop the current service and do not do anything else.

6. The function of the SIGHUP signal is to restart the service.

7. For services that require sockets, do not create the socket yourself and let systemd pass in the socket.

8. Use the sd_notify() function to notify the systemd service of its status changes. Generally, it can be called when the service initialization is completed and the service is ready.



### Preparation of Unit files

For developers, the most workload should be writing configuration unit files and defining the required units.

For example, if a developer develops a new service program, such as httpd, he or she needs to write a configuration unit file for it so that the service can be managed by systemd, similar to UpStart's working configuration file. Define the command line syntax for service startup in this file, as well as dependencies on other services.

In addition, we have learned before that systemd has many functions. It is not only used to manage services, but also to manage mount points, define scheduled tasks, etc. These tasks are completed by editing the corresponding hive file. I'm giving a few examples of hive files here.

**Service hive file, service hive file has `.service` as the file name suffix. **

openim also wrote some configuration files about its own services, such as `openim-api.service`



## Supervisord

Supervisord is a process management tool implemented in Python. The program that supervisord requires to be managed is a non-daemon program. Supervisord will help you convert it into a daemon program. Therefore, if supervisord is used to manage the process, the process needs to be started in a non-daemon manner.

For example: If you want to manage nginx, you must add a line to the nginx configuration file to set daemon off to let nginx start in a non-daemon mode.

Install:

```bash
apt install supervisor || yum install supervisor
```

After installation, you can modify the last line:

```bash
files = /etc/supervisor/conf.d/*.conf
```

Change to the `/opt/supervisord.d/` directory:

```bash
files = /opt/supervisord.d/*.ini
```

**The above address can be customized, and all files ending with ini in the /opt/supervisord.d folder will be read as configuration**

**Then create a new configuration under /opt/supervisord.d/ such as test.ini**

```ini
;Process name is the project name
[program:test]

;Script directory: running process file directory
directory=/opt/ytgMateriel/materialBackend

;Startup command here is the java jar startup command
command=/opt/jdk1.8.0_171/bin/java -Xms512m -Xmx1024m -jar -Dspring.profiles.active=prd -Djava.io.tmpdir=./tmp -Dloader.path=lib ytg-material-backend.jar

;Command to stop the process. Default is quit.
stopsignal=KILL

;Whether supervisor starts at the same time when it starts, default True
;When the program exits, the program will not automatically restart. The default is unexpected. To set the automatic restart after the child process hangs up, there are three options, false, unexpected and true. If it is false, it will not be restarted under any circumstances. If it is unexpected, it will only be when the exit code of the process is not defined in the exitcodes below.
autorestart=true

;This option is the number of seconds after the child process starts. If the status is running at this time, we think the startup is successful. The default value is 1
startsecs=3

;log
stdout_logfile=/opt/ytgMateriel/materialBackend/logs/ytg-material-backend.log

;stdout log file size, default 50MB
stdout_logfile_maxbytes=100MB

;Stdout log file backup number
stdout_logfile_backups=50
user=root

;Redirect stderr to stdout, default false
redirect_stderr=true
```



**Start supervisord**

Start `supervisord` before using the supervisor process management command, otherwise the program will report an error.

```bash
supervisord -c /etc/supervisord.conf
```

Common commands

```cpp
supervisorctl status //View the status of all processes
supervisorctl stop process name //stop es
supervisorctl start process name //start es
supervisorctl restart process name //restart es
supervisorctl update //Use this command to load the new configuration after modifying the configuration file.
supervisorctl reload //Restart all programs in the configuration
```



## Comparison between Systemd and Supervisord

Both Systemd and Supervisord can be used to control processes to achieve group management of processes and automatic restart after crash.

Both Supervisord and Systemd use ini as the configuration file format. Unlike Supervisord, Systemd requires a separate unit file for each program.

Supervisord can start/stop all processes in the configuration file (or processes in a process group configuration) at the same time.

In other words, Supervisord uses the concept of "process group" to control multiple processes, and Systemd uses dependencies to achieve this.

Let’s take a look at a simple Systemd configuration file to implement process group management

```ini
; group.target
[Unit]
Description=Application
Wants=prog1.service prog2.service
```

First:

```ini
; prog1.service
[Unit]
Description=prog1
PartOf=group.target

[Service]
ExecStart=/usr/bin/prog1
Restart=on-failure
```

the second:

```ini
; prog2.service
[Unit]
Description=prog2
PartOf=group.target

[Service]
ExecStart=/usr/bin/prog2
Restart=on-failure
```

`systemctl start group.target`, prog1 and prog2 will also be started. `systemctl restart group.target`, prog1 and prog2 will also be restarted.



In comparison, Supervisord’s management method is a bit clearer:

```ini
[program:prog1]
command=python /home/user/myapp/prog1.py

[program:prog2]
command=python /home/user/myapp/prog2.py

[group:prog]
programs=prog1,prog2
```

`supervisorctl start prog:*` can start all processes under the prog group

But supervisord has one advantage. If you don't know which programs have their configuration changed, simply execute `supervisorctl update` and all involved processes will be restarted.

supervisor and [launchd](https://en.wikipedia.org/wiki/Launchd), [daemontools](http://cr.yp.to/daemontools.html), [runit](http://smarden. Programs such as org/runit/) have the same function. Unlike some programs, it does not replace init as a "process with id 1". Instead, it is used to control applications, just like starting other programs. The popular understanding is that the process programs managed by the Supervisor service run as child processes of the supervisor, and the supervisor is the parent process. Supervisor monitors and manages the startup and shutdown of child processes and their automatic startup after abnormal exit.



### Multi-process template

For `Supervisord`, only one configuration file needs to be maintained, while for `systemd`, many configuration files need to be maintained, and the configuration items are also more complex.

If you need to create many services, but the configuration files of the services are only slightly different in the `ExecStart` item, you can consider using the template function.

For example, create a service file `/etc/systemd/system/ping@.service`

```ini
[Unit]
Description=Ping service %i

[Service]
Type=simple
ExecStart=/usr/bin/ping %i

[Install]
WantedBy=multi-user.target
```

The process can be started like this `systemctl start ping@127.0.0.1.service`. In fact, the `.service` suffix can be omitted when starting the service, that is, `systemctl start ping@127.0.0.1`. If you want to start multiple services at one time, You can `systemctl start ping@127.0.0.1 ping@127.0.0.2`, and stopping the service is similar.

In this way, if you want to `ping` another address, you only need to modify the string after `@` in the command.

It also supports concatenating strings as follows

```ini
[Unit]
Description=Ping service %i

[Service]
Type=simple
ExecStart=/usr/bin/ping 127.0.0.%i

[Install]
WantedBy=multi-user.target
```

`systemctl start ping@1` will execute the `ping 127.0.0.1` service

There is actually a case difference for `%i` in the configuration file. `%i` is an escaped string and `%I` is an unescaped string. For a complete list of specifiers, see [systemd .unit (www.freedesktop.org)](https://www.freedesktop.org/software/systemd/man/systemd.unit.html)



### Chain startup (service dependency)

There is a situation where multiple services need to be started at the same time, and they have restrictions on the startup order. Then you can configure it as follows

Suppose there are `A process`, `B process`, `C process`, and you want to start them in order, then you can configure them like this

```bash
# cat /etc/systemd/system/C.service
[Unit]
Description=C Process
Requires=B.service
After=B.service

[Service]
Type=simple
ExecStart=/export/CProgram

[Install]
WantedBy=multi-user.target
```

For B service

```ini
# cat /etc/systemd/system/B.service
[Unit]
Description=B Process
Requires=A.service
After=A.service

[Service]
Type=simple
ExecStart=/export/BProgram

[Install]
WantedBy=multi-user.target
```

For service A

```ini
# cat /etc/systemd/system/A.service
[Unit]
Description=A Process

[Service]
Type=simple
ExecStart=/export/AProgram

[Install]
WantedBy=multi-user.target
```

The effect is that after `systemctl start C.service`, several processes will be started in sequence. `Requires` specifies the dependencies between several services. Because the startup order between services is specified through `After` selection, several services are started in sequence. Without `After`, **Startup order is not guaranteed**

If `systemctl stop A.service` is used at this time, several services will be shut down, because `Requires` requires that the front-end service must exist, otherwise it should not be started. If you do not want your own service to be shut down, you can replace `Requires` with `Wants`.

If you want to form a dependency chain, you can also use `Before` in addition to `After`



### View service output - journalctl

`systemd` is not only used to run services, it also has a logging service, which is used to replace the `syslog` of the old system.

The standard output and error output of the running service will be handed over to `journald` for management. To view a certain service, you can use the command `journalctl -u ping@1`. With the `-e` parameter, you can jump to the latest line with the `-f` parameter. You can see real-time output. The `-n` parameter can specify the number of output lines, and `-r` outputs in reverse order.

For example `journalctl -u ping@1 -e` or `journalctl -u ping@1 -f`

If the output of the service is too much, you can configure `StandardOutput=null` in the `[Unit]` section of the `.servive` file

You can also pass `systemctl status xx.service`View part of the output of the service

```bash
# View all logs (by default, only the logs of this startup are saved)
$ sudo journalctl

# View kernel logs (do not display application logs)
$ sudo journalctl -k

# View the logs of this system startup
$ sudo journalctl -b
$ sudo journalctl -b -0

# View the log of the last startup (need to change settings)
$ sudo journalctl -b -1

# View logs for a specified time
$ sudo journalctl --since="2012-10-30 18:17:16"
$ sudo journalctl --since "20 min ago"
$ sudo journalctl --since yesterday
$ sudo journalctl --since "2015-01-10" --until "2015-01-11 03:00"
$ sudo journalctl --since 09:00 --until "1 hour ago"

# Display the latest 10 lines of logs at the end
$ sudo journalctl -n

# Display the log with the specified number of lines at the end
$ sudo journalctl -n 20

# Scroll and display the latest logs in real time
$ sudo journalctl -f

# View the logs of the specified service
$ sudo journalctl /usr/lib/systemd/systemd

# View the logs of the specified process
$ sudo journalctl _PID=1

# View the log of a script in a certain path
$ sudo journalctl /usr/bin/bash

# View the logs of the specified user
$ sudo journalctl _UID=33 --since today

# View the log of a Unit
$ sudo journalctl -u nginx.service
$ sudo journalctl -u nginx.service --since today

# Scroll and display the latest log of a Unit in real time
$ sudo journalctl -u nginx.service -f

# Combine and display the logs of multiple Units
$ journalctl -u nginx.service -u php-fpm.service --since today

# View logs with specified priority (and above), there are 8 levels in total
# 0: emerge
#1: alert
#2:crit
#3: err
#4: warning
#5: notice
#6: info
#7: debug
$ sudo journalctl -p err -b

# Log output is paged by default. --no-pager changes to normal standard output.
$ sudo journalctl --no-pager

# Output in JSON format (single line)
$ sudo journalctl -b -u nginx.service -o json

# Output in JSON format (multiple lines) for better readability
$ sudo journalctl -b -u nginx.serviceqq
  -o json-pretty

# Display the hard disk space occupied by the log
$ sudo journalctl --disk-usage

#Specify the maximum space occupied by the log file
$ sudo journalctl --vacuum-size=1G

# Specify how long the log file should be saved
$ sudo journalctl --vacuum-time=1years
```





## OpenIM configuration System

Among the multiple considerations above, OpenIM finally chose System because we already have a backend solution.

First, consider templating each configuration, which is our first step.

Using templates, a template unit file can create multiple instantiated unit files, thereby simplifying system configuration.

The file name of the template unit file contains an @ symbol, which is located between the unit base file name and the extension, such as:

```
example@.service
```

When creating an instance unit file from a template unit file, add the instance name before the @ symbol and the unit extension (including the . symbol), for example:

```bash
example@instance1.service
```

Indicates that the instance unit file [example@instance1.service](https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=example@instance1.service) is instantiated from the template unit file example@.service, Its instance name is instance1

The instance unit file is generally a symbolic link to the template unit file. If the symbolic link contains the instance name, systemd will pass the instance name to the template unit file.

After creating the instance unit file symbolic link in the corresponding target, you need to run the following command to load it:

```bash
$ sudo systemctl daemon-reload
```

**Template identifier/parameter**

Some identifiers can be used in template unit files. When instantiated as an instance unit file and run, systemd will pass the actual value of the identifier to the corresponding identifier. For example, `%i` is used in the template unit file. When the instance unit file is actually run, the instance name is passed to the `%i` identifier. (Chinese means the characters after `@` and the characters before `.service`)

| placeholder | description |
| ------ | ------------------------------------------ ------------------ |
| %n | Inserts the full unit name when it appears in the template file. |
| %N | Same as above, but reverses any escapes such as those present in file path patterns. |
| %p | This refers to the unit name prefix. This is the part of the unit name before the @ symbol. |
| %P | Same as above, but reverses any escapes. |
| %i | This refers to the instance name, i.e. the identifier after @ in the instance unit. This is one of the most commonly used specifiers because it is guaranteed to be dynamic. Use of this identifier encourages the use of configuration-important identifiers. For example, the port on which the service runs can be used as an instance identifier, and templates can use this specifier to set the port specification. |
| %I | This specifier is the same as above, but will reverse any escapes. |
| %f | This will be replaced with the unescaped instance name or prefix name, preceded by a /. |
| %c | This indicates the unit's control group, with the standard parent hierarchy `/sys/fs/cgroup/ssytemd/` removed. |
| %u | The name of the user configured to run the unit. |
| %U | Same as above, but as a numeric UID instead of a name. |
| %H | The host name of the system on which this unit is running. |
| %% | Percent symbol used to insert text. |



## accomplish

Take `openim-crontask` as an example:

```bash
#!/usr/bin/env bash

# Copyright © 2023 OpenIM. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# OpenIM CronTask Control Script
#
# Description:
# This script provides a control interface for the OpenIM CronTask service within a Linux environment. It supports two installation methods: installation via function calls to systemctl, and direct installation through background processes.
#
#Features:
# 1. Robust error handling leveraging Bash built-ins such as 'errexit', 'nounset', and 'pipefail'.
# 2. Capability to source common utility functions and configurations, ensuring environmental consistency.
# 3. Comprehensive logging tools, offering clear operational insights.
# 4. Support for creating, managing, and interacting with Linux systemd services.
# 5. Mechanisms to verify the successful running of the service.
#
#Usage:
# 1. Direct Script Execution:
# This will start the OpenIM CronTask directly through a background process.
# Example: ./openim-crontask.sh openim::crontask::start
#
# 2. Controlling through Functions for systemctl operations:
# Specific operations like installation, uninstallation, and status check can be executed by passing the respective function name as an argument to the script.
# Example: ./openim-crontask.sh openim::crontask::install
# 
# Note: Ensure that the appropriate permissions and environmental variables are set prior to script execution.
# 

OPENIM_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd -P)
[[ -z ${COMMON_SOURCED} ]] && source "${OPENIM_ROOT}"/scripts/install/common.sh

SERVER_NAME="openim-crontask"

function openim::crontask::start()
{
    openim::log::info "Start OpenIM Cron, binary root: ${SERVER_NAME}"
    openim::log::status "Start OpenIM Cron, path: ${OPENIM_CRONTASK_BINARY}"

    openim::util::stop_services_with_name ${SERVER_NAME}

    openim::log::status "start cron_task process, path: ${OPENIM_CRONTASK_BINARY}"
    nohup ${OPENIM_CRONTASK_BINARY} >> ${LOG_FILE} 2>&1 &
    openim::util::check_process_names ${SERVER_NAME}
}

###################################### Linux Systemd ######################################
SYSTEM_FILE_PATH="/etc/systemd/system/${SERVER_NAME}.service"

# Print the necessary information after installation
function openim::crontask::info() {
cat << EOF
openim-crontask listen on: ${OPENIM_CRONTASK_HOST}
EOF
}

# install openim-crontask
function openim::crontask::install()
{
  pushd "${OPENIM_ROOT}"

  # 1. Build openim-crontask
  make build BINS=${SERVER_NAME}
  openim::common::sudo "cp ${OPENIM_OUTPUT_HOSTBIN}/${SERVER_NAME} ${OPENIM_INSTALL_DIR}/bin"

  openim::log::status "${SERVER_NAME} binary: ${OPENIM_INSTALL_DIR}/bin/${SERVER_NAME}"

  # 2. Generate and install the openim-crontask configuration file (openim-crontask.yaml)
  echo ${LINUX_PASSWORD} | sudo -S bash -c \
    "./scripts/genconfig.sh ${ENV_FILE} deployments/templates/${SERVER_NAME}.yaml > ${OPENIM_CONFIG_DIR}/${SERVER_NAME}.yaml"
  openim::log::status "${SERVER_NAME} config file: ${OPENIM_CONFIG_DIR}/${SERVER_NAME}.yaml"

  # 3. Create and install the ${SERVER_NAME} systemd unit file
  echo ${LINUX_PASSWORD} | sudo -S bash -c \
    "./scripts/genconfig.sh ${ENV_FILE} deployments/templates/init/${SERVER_NAME}.service > ${SYSTEM_FILE_PATH}"
  openim::log::status "${SERVER_NAME} systemd file: ${SYSTEM_FILE_PATH}"

  # 4. Start the openim-crontask service
  openim::common::sudo "systemctl daemon-reload"
  openim::common::sudo "systemctl restart ${SERVER_NAME}"
  openim::common::sudo "systemctl enable ${SERVER_NAME}"
  openim::crontask::status || return 1
  openim::crontask::info

  openim::log::info "install ${SERVER_NAME} successfully"
  popd
}


# Unload
function openim::crontask::uninstall()
{
  set +o errexit
  openim::common::sudo "systemctl stop ${SERVER_NAME}"
  openim::common::sudo "systemctl disable ${SERVER_NAME}"
  openim::common::sudo "rm -f ${OPENIM_INSTALL_DIR}/bin/${SERVER_NAME}"
  openim::common::sudo "rm -f ${OPENIM_CONFIG_DIR}/${SERVER_NAME}.yaml"
  openim::common::sudo "rm -f /etc/systemd/system/${SERVER_NAME}.service"
  set -o errexit
  openim::log::info "uninstall ${SERVER_NAME} successfully"
}

# Status Check
function openim::crontask::status()
{
  # Check the running status of the ${SERVER_NAME}. If active (running) is displayed, the ${SERVER_NAME} is started successfully.
  systemctl status ${SERVER_NAME}|grep -q 'active' || {
    openim::log::error "${SERVER_NAME} failed to start, maybe not installed properly"
    return 1
  }

  # The listening port is hardcode in the configuration file
  if echo | telnet 127.0.0.1 7070 2>&1|grep refused &>/dev/null;then
    openim::log::error "cannot access health check port, ${SERVER_NAME} maybe not startup"
    return 1
  fi
}

if [[ "$*" =~ openim::crontask:: ]];then
  eval $*
fi
```



**service:**

```bash
[Unit]
Description=OPENIM OPENIM CRONTASK
Documentation=Manages the OpenIM CronTask service, with both direct and systemctl installation methods.
Documentation=https://github.com/OpenIMSDK/Open-IM-Server/blob/main/deployment/init/README.md

[Service]
WorkingDirectory=${OPENIM_DATA_DIR}/openim-crontask
ExecStartPre=/usr/bin/mkdir -p ${OPENIM_DATA_DIR}/openim-crontask
ExecStartPre=/usr/bin/mkdir -p ${OPENIM_LOG_DIR}
ExecStart=${OPENIM_INSTALL_DIR}/bin/openim-crontask -c=${OPENIM_CONFIG_DIR}
Restart=always
RestartSec=5
StartLimitInterval=0

[Install]
WantedBy=multi-user.target
```
