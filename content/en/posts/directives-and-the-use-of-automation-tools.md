---
title: 'Decoding Go Language Source Code: A Deep Dive into go: Directives and the Use of Automation Tools'
ShowRssButtonInSectionTermList: true
cover.image:
date: 2024-01-25T15:22:36+08:00
draft : false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
  - golang
  - go
categories:
  - Development
---

# These go: instructions in the Go source code && go automation tools

Developers have a strong tendency to automate repetitive tasks, and this also applies to writing code.

Boilerplate code may include operations such as setting up a basic file structure, initializing variables, defining functions, or importing libraries or modules.

1. In some cases, packages provide boilerplate code as a starting point for developers to build from, typically generated after the code behavior has been configured.
2. Although boilerplate code may be necessary and valuable to application functionality, it can also be wasteful and redundant. For this reason, there are many tools that minimize boilerplate code.
3. `go generate` is a command line tool for the Go programming language that allows automatic code generation. You can use `go generate` to generate easily modifiable code specific to your project, making the tool powerful at reducing boilerplate.

`go generate` This command is usually used to automatically generate code before compilation. It can be used to create repetitive or patterned code, thereby saving time and reducing errors. Think about it, in what situations would this be particularly useful? 🤔

For example, here is a simple example in code:

```jsx
//go:generate echo Hello, cubxxw !
```

In this example, when we run the **`go generate`** command, it will execute the command specified in the comment. In this example, it will print "Hello, cubxxw!".

Therefore, the topic of metaprogramming is a popular area of development and research, dating back to Lisp in the 1960s. One area of metaprogramming that is particularly useful is code-generation. Languages that support macros have this functionality built-in; other languages extend existing functionality to support this.

## `go:generate`

In our previous discussion, we have covered the basics of the "Go Generate" command. Now we'll dive into some more specific use cases and practical tips. 🚀

Let's start with some terminology. The way go generate works is mainly coordinated between three participants:

- Generator: is the program or script called by go generate. In any given project, multiple generators can be called, a single generator can be called multiple times, etc.
- Magic comments: are specially formatted comments in a `.go` file that specify which generator to call and how. Any comment starting with a line of text `//go:generate` is legal.
- go generate : is a Go tool that reads Go source files, finds and parses magic comments, and runs the specified generator.

It’s important to emphasize that the above is the full scope of automation that Go provides for code generation. As with anything else, developers are free to use whatever workflow works for them. For example, go generate should always be run manually by developers; it should never be called automatically (e.g. not as part of go build). Furthermore, since we typically use Go to ship binaries to users or execution environments, it is easy to understand that go generate is only run during development (perhaps just before running go build); the user of the Go program will not know which part of the code is generated of and how it is generated. (In fact, many times a comment will be added at the beginning of the generated file. This is generated, please do not modify it manually.)

This also applies to building modules; go generate will not run generators that import packages. Therefore, when a project is released, the generated code should be checked and distributed along with the rest of the code.

**Advanced usage of Go Generate**

1. **Generate simulation implementation of interface**:

     - In testing, we often need to simulate some interfaces. Using "Go Generate" we can automate this process. For example, we can use the **`mockgen`** tool to generate a mock implementation of an interface.
     - Just imagine, if you have a large project that requires multiple interface simulations, how can "Go Generate" help you save time and reduce duplication of work? 🤔

     **The following Demo briefly introduces how to use Mockgen:**

     1. **Install Mockgen**:

         - First, make sure you have the **`mockgen`** tool installed. It can be installed using the following command:

             ```arduino
             go get github.com/golang/mock/mockgen
             ```

     2. **Write your interface**:

         - Suppose we have an interface called **`MyInterface`** for which we want to generate a mock implementation. This interface may be located in a file called **`myinterface.go`**.

             ```go
             package mypackage
            
             // MyInterface is the interface we will simulate
             type MyInterface interface {
                 DoSomething() bool
             }
             ```

     3. **Use Go Generate to generate Mock**:

         - At the top of the **`myinterface.go`** file, we add a special comment line that instructs **`go generate`** how to generate the mock. This line of comments should follow the following format:

             ```go
             //go:generate mockgen -source=myinterface.go -destination=mock_myinterface.go -package=mypackage
             ```

         - Here, **`source`** specifies the source interface file, **`destination`** specifies the location and name of the generated mock file, and **`package`** specifies the package name.

     4. **Run Go Generate**:

         - Now, when you run the **`go generate`** command in a directory containing **`myinterface.go`**, it will read the comment at the top of the file and execute the **`mockgen`** command To generate mock implementation.

             ```go
             gogenerex
             ```

     5. **Use the generated Mock**:

         - The generated **`mock_myinterface.go`** file will contain the mock implementation of **`MyInterface`**. You can use this mock in your tests instead of the actual interface implementation.

     ## Example Demo

     Let's look at a simple example to demonstrate this process:

     1. Create a file named **`myinterface.go`** with the following content:

         ```go
         package mypackage
        
         // MyInterface is the interface we will simulate
         type MyInterface interface {
             DoSomething() bool
         }
        
         //go:generate mockgen -source=myinterface.go -destination=mock_myinterface.go -package=mypackage
        
         ```

     2. Run **`go generate`** in the same directory. This will generate the **`mock_myinterface.go`** file.

     3. In tests, you can import and use this mock implementation.

2. **Automatically generate documents**:

     - "Go Generate" can also be used to automatically generate code documentation. This is especially useful for maintaining large code bases, ensuring documentation remains in sync with code implementation.
     - Through comments and specific tools, we can let "Go Generate" automatically generate updated documentation to maintain the continuity and accuracy of development documentation.

3. **Code template instantiation**:

     - For those code parts that have similar structure and logic but different details, we can use "Go Generate" combined with code templates to instantiate these parts. This is especially useful when dealing with large numbers of similar structures.
     - Imagine how you can use "Go Generate" to increase efficiency and reduce errors when creating a series of similar data models or handlers.

💻 Let’s try a practical example: Let’s say we have an interface and we want to generate a mock implementation for it. We can add the following comments next to the interface definition:

```go
//go:generate mockgen -source=myinterface.go -destination=mock_myinterface.go -package=mypackage
```

When we run the **`go generate`** command, it will automatically call the **`mockgen`** tool and generate mock implementation code for our interface.

### Challenges and Skills in Practice

1. **Handle complex generation scenarios**:
     - In complex projects, the "Go Generate" command may need to handle multiple files and different generation rules. In these cases, it is important to maintain clear and organized build instructions.
     - For example, you may need multiple **`//go:generate`** directives in different directories, each calling a different tool or script.
2. **Integrated into the build process**:
     - In the actual development process, the "Go Generate" command is usually integrated into the automated build process. This means that every time the code base is built, the relevant build commands are automatically executed.
     - It is crucial to ensure that the "Go Generate" command is properly integrated into your build script or build system. This can be achieved through a Makefile or a script within the CI/CD process.
3. **Optimize generation performance**:
     - In some large projects, running the "Go Generate" command frequently may cause performance issues. Therefore, it is very important to organize and optimize the generation logic reasonably.
     - For example, run build commands only when relevant source files change, or use caching to avoid duplicate build work.

💻 Let’s look at a simple example: Let’s say we have a project with multiple submodules that need to generate code. We can create a Makefile in the root directory of the project, which contains the logic to execute the **`go generate`** command for all submodules.

```makefile
generate:
     @echo "Generating code..."
     @go generate ./...
```

In this example, when we run the **`make generate`** command, it will iterate through each submodule of the project and run the corresponding **`//go:generate`** directive in each directory. The build command.

## `go:build`

Let’s start exploring the `go:build` directive in the Go language! 🔨

First, the `go:build` directive is used to specify build constraints in Go source files. Build constraints allow us to include or exclude source files based on different conditions such as operating system, architecture, or custom tags.

**Why is it important? ** 💡

- In large projects, different code may need to be compiled based on different platforms or configurations. The `go:build` directive gives us flexible control over which code is included in the build.

**Example:**

```go
//go:build linux
```

In this example, the source file will only be included in the build if the target platform is Linux.

**A few more scenes:**

- The test environment uses mock services; while the official environment uses real data
- Free, Professional and Enterprise versions offer different features
- Different operating systemsCompatibility handling. Usually used for cross-platform, such as windows, linux, mac different compatible processing logic.
- Compatibility processing for lower versions of go

Example: There are the following two files:

1. `main.go`

```jsx
package main
 
import "fmt"
 
func main() {
fmt.Println("OK")
}
```

1. `init.go`

```jsx
//go:build init
 
package main
 
import "fmt"
 
func init() {
fmt.Println("Init.")
}
```

Different compilation parameters, the final executable file output is also different:

```jsx
% go build
%ls
cmd init.go main.go
% ./cmd
OK
 
% go build -tags init
% ./cmd
Init.
OK
```

**Another example of using it to debug code:**

Let's say you're working on a Go project and you have some debug code that you just want to include in the build for testing purposes. You can create a file with a build flag such as the **`// +build debug`** or **`go:build debug`** directive. This way, Go will include this file when you build your project with the **`debug`** tag. Otherwise, it will be ignored. Not bad right? 📚

Here's a small snippet to illustrate:

```jsx
// +build debug

package main

import "fmt"

func main() {
     fmt.Println("Debugging mode is on!")
}
```

In this code snippet, the **`println`** statement is executed only when the project is built with the **`debug`** flag. This is a great way to separate debug code from production code.

## Advanced applications of the `go:build` command

The go documentation calls it Build Constraints, that is, compilation restrictions. Also called build tag.

Used to limit whether an entire file should be compiled into the final binary file, rather than a partial code fragment (block) in a file

1. **Complex build conditions**:
     - The `go:build` directive is not limited to simple operating system or architecture checks, it can also be used for more complex combinations of conditions.
     - For example, you can combine multiple conditions like `//go:build linux && amd64`, which means the code will only compile if the target platform is Linux and the architecture is amd64.
2. **Combined use with build tags**:
     - In addition to system-level build conditions, the `go:build` directive can also be used in conjunction with custom build tags.
     - For example, `//go:build debug` can be used to include additional debugging code in development mode.
3. **Manage large-scale projects**:
     - In large projects, the `go:build` directive helps manage different build configurations, such as distinguishing production and development code.
     - This is useful for maintaining a complex code base with multiple modules and optional features.

💻 **Practice example**:

```go
//go:build linux && amd64
// +build !debug

package mypackage

// Here is the code only on Linux amd64 platform and not in debug mode
```

In this example, the source files are only compiled on the Linux amd64 platform and will not be compiled with the `debug` tag enabled.

### 📚 Detailed introduction: Use in combination with build tags

In the Go language, Build Tags are a powerful tool for controlling which code files are included in the build at compile time. When combined with the `go:build` directive, they provide greater flexibility and precise control.

**Basic concepts of building tags**:

- Build tags are defined at the top of the source file via comments, such as `// +build debug`.
- They can be used to mark files for different build configurations such as debug mode, specific operating systems or custom conditions.

**Combined with `go:build` directive**:

- "go:build" directives and build tags can be combined in the same file to implement more complex build logic.
- For example, `//go:build linux && amd64` and `// +build debug` can together determine whether a file is included in a specific build.

**Example**:

```go
//go:build linux
// +build debug

package mypackage

// These codes only compile on Linux platforms and when debug mode is turned on
```

In this example, this source file will only be included in the build if the target platform is Linux and debug mode is turned on.

### 💻 Practical application cases

Imagine you are developing a cross-platform application and want to include some additional debugging information or testing capabilities during development.

1. **Create special debugging files**:
     - Add `// +build debug` tag at the top of the file.
     - These files will only be included if you build with the `debug` tag.
2. **Incorporate operating system or architecture specific code**:
     - Use the `go:build` directive to define operating system or architecture specific conditions.
     - Combined with `// +build debug`, it is possible to create code that is both platform-specific and only valid in debug mode.
3. **Use tags in build scripts**:
     - Enable these debug-specific files via the `tags 'debug'` parameter in your build script or command.

## `go:embed`

---

Now, let’s start learning about the `go:embed` function in Go language.

The Go language is a compiled, statically typed language developed by Google and known for its simplicity, efficiency, and readability. The `go:embed` function of the Go language is a new feature introduced in Go 1.16 version, which allows developers to embed static files and folders directly in Go programs. This feature is very useful because it simplifies the process of including file data into Go programs. 📚

Before `go:embed`, embedding files into Go programs often required additional steps, such as using third-party tools to generate Go code for the file data. However, with `go:embed`, this becomes much easier. Developers only need to use the specific `//go:embed` directive and specify the files or directories to be embedded through specific syntax. 👀

For example, if you wanted to embed a file called `example.txt` in your program, you would do this:

```go
import "embed"

//go:embed example.txt
var exampleFile embed.FS

```

Here, `embed.FS` is a special file system type used to access embedded files. This variable `exampleFile` now contains the contents of `example.txt` and can be used in the program. 💡

This feature is particularly useful when creating applications that need to access large amounts of static resources, such as web servers or desktop applications. It also helps simplify deployment and distribution because all necessary resources are included in a single executable file. 🎉

Now, I'll show you how to use go:embed through a practical code example. This example will demonstrate how to embed a text file in a simple Go program and read the contents of the file while the program is running.

```go
package main

import (
     "embed"
     "fmt"
     "io/fs"
     "log"
)

//go:embed example.txt
var embeddedFiles embed.FS

func main() {
     data, err := fs.ReadFile(embeddedFiles, "example.txt")
     if err != nil {
         log.Fatal(err)
     }

     fmt.Println("Content of embedded file:")
     fmt.Println(string(data))
}
```

In this example, we first import the **`embed`** package, which is part of the Go standard library. We use the **`//go:embed example.txt`** directive to instruct the compiler to embed a file named **`example.txt`**. The **`embeddedFiles`** variable now contains the contents of this file.

**Call the `fs.ReadFile` function**:
**`fs.ReadFile`** accepts two parameters: a file system that implements the **`fs.FS`** interface and the name of the file to be read. It returns a byte slice of the file's contents and an error value.

```go
data, err := fs.ReadFile(fileSystem, "filename.txt")
if err != nil {
     // Handle errors
}
```

- **`fileSystem`**: This is a file system that implements the **`fs.FS`** interface. It can be a file system embedded through **`embed`** or an ordinary file system. .
- **`"filename.txt"`**: This is the name of the file you want to read.

In the **`main`** function, we use the **`fs.ReadFile`** function to read the embedded file content. Then, we print out the contents of this file.

This example shows the basic usage of **`go:embed`**, which makes including static files in Go programs very simple and straightforward.

In fact, OpenIM also uses **`go:embed`**, which is very simple to use:

```jsx
//go:embed version
var Version string
```

Then just write the corresponding version number directly in the corresponding version file.

> In this example, **`version`** is the name of a file whose contents will be embedded in the **`Version`** variable. Here, **`Version`** is a variable of string type. When using this method, the embedded file should be a text file and its contents will be assigned directly to the variable as a string. This method is suitable for situations where the file content is short and you want to use the file content directly as a string.

If you use the **`//go:embed`** directive and want to process multiple files or an entire directory, you can use a variable of type **`embed.FS`**. In this case, **`embed.FS`** behaves as a file system from which you can read multiple files. Here's how to handle multiple files:

1. **Embed multiple files or directories**:
     You can embed multiple files or directories by listing them after the **`//go:embed`** directive. For example, if you want to embed a directory and all its contents, you can do this:

      ```go
     //go:embed mydir
     var myFSembed.FS
      ```

      This will embed the **`mydir`** directory and all its subdirectories and files. You can also specify multiple separate files:

      ```go
     //go:embed file1.txt file2.txt
     var myFilesembed.FS
      ```

2. **Access embedded files**:
     To access an embedded file, you can use the methods provided by **`embed.FS`**, such as **`ReadFile`** or **`ReadDir`**. For example, to read the contents of a file:

      ```go
     data, err := myFS.ReadFile("file1.txt")
     if err != nil {
         // Handle errors
     }
     fmt.Println(string(data))
      ```To enumerate the files in a directory you can do this:

      ```go
     entries, err := myFS.ReadDir("mydir")
     if err != nil {
         // Handle errors
     }
    
     for _, entry := range entries {
         fmt.Println(entry.Name())
         // The contents of each file can be further read
     }
      ```

3. **Notes**:

     - Embedded files are determined at compile time, you cannot dynamically add or change embedded files at runtime.
     - When using **`embed.FS`**, the file path is relative to the directory where the Go source file is located. Make sure you take this into account when using file paths.
     - **`embed.FS`** is read-only, you cannot use it to modify files.

## `go:linkname`

`go:linkname` is a compiler directive in the Go language that allows you to link to a private function or variable of another package in Go code. This technique is typically used for advanced use cases, such as when working with low-level operations or linking to internal implementations of the standard library. Using `go:linkname` can bypass Go's type safety and encapsulation mechanisms, so use it with caution.

To use `go:linkname`, you need to import the `unsafe` package, even if you don't use it directly. This is because `go:linkname` itself is an unsafe operation and may cause erratic program behavior. Here is the basic usage of `go:linkname`:

1. **Import `unsafe` package**:

     ```go
     import_"unsafe"
     ```

2. **Use `go:linkname`**:
     Use the `//go:linkname` directive to link a local function or variable to a private function or variable of another package. The format is as follows:

      ```go
     //go:linkname localName import/path.name
      ```

      Among them, `localName` is the name of the function or variable you defined in the current package, and `import/path.name` is the full path name of the function or variable in the target package.

3. **Define local functions or variables**:
     After the linkage declaration, define a local function or variable with the same signature as the target function or variable.

For example, if you want to link to a private function of a package in the standard library, you can do this:

```go
//Import unsafe package
import_"unsafe"

// Link to private functions in runtime package
//go:linkname myLocalFunc runtime.myPrivateFunc
func myLocalFunc() int

func main() {
     // Now you can call myLocalFunc in your code, which will call runtime.myPrivateFunc
     result := myLocalFunc()
     println(result)
}
```

You need to pay attention to the following points when using `go:linkname`:

- This is a very powerful and dangerous property. Improper use may cause the program to crash or behave unpredictably.
- `go:linkname` is mainly used for writing libraries or doing high-level system programming, and for most general development work, using it is not a good idea.
- Since `go:linkname` bypasses Go's type safety mechanism, it may make the code difficult to maintain and understand.
- The internal implementation of the standard library may differ between versions of the Go language, so using `go:linkname` to link to private parts of the standard library may cause the code to break in future versions.

## `go:nosplit`

`go:nosplit` is a compiler directive in the Go language that is used to control the stack splitting behavior of functions. Before we understand `go:nosplit` in depth, we need to understand the concept of stack splitting.

In the Go language, in order to support high concurrency, each goroutine has its own stack space. Go uses a technique called stack splitting to dynamically grow a goroutine's stack space. When a function is called, Go checks whether the remaining space on the current stack is enough to execute the function. If it is not enough, Go will allocate a larger stack space and copy the contents of the existing stack to the new stack. This process is stack splitting.

However, in some special cases, the programmer may need to ensure that a function does not trigger a stack split when executed, usually for performance reasons or because the function itself is related to stack management. In this case, you can use the `go:nosplit` directive. When a function is marked with `go:nosplit`, the compiler guarantees that no stack splitting occurs during execution of the function.

For example:

```go
//go:nosplit
func MyFunction() {
     // Function implementation
}
```

You need to be very careful when using `go:nosplit` because if there is insufficient stack space when executing this function, the program may crash with a stack overflow. Therefore, you should only use this instruction if you know exactly what you are doing and understand the details of stack splitting.

Usually, `go:nosplit` is mainly used for low-level programming, such as system calls, runtime library implementation and other scenarios. For most advanced application development, the use of the `go:nosplit` directive is rarely necessary.

## `go:noescape`

In the Go language, `//go:noescape` is a compiler directive that tells the compiler to apply specific optimizations at compile time. The main function of this directive is to notify the compiler that the parameters of the marked function will not escape to the heap. Normally, Go's compiler automatically decides whether to allocate a variable on the stack or the heap. If a variable survives a function's return (for example, is returned or stored in a global variable), the variable is typically allocated on the heap so that it survives the function's execution.

Using the `//go:noescape` directive tells the compiler not to move arguments onto the heap even if there is evidence of escape analysis. This optimizes performance because allocating and deallocating memory on the stack is faster than on the heap, and there is no garbage collection involved.

This directive is typically used in low-level programming or performance-critical code, such as in Go's standard library. For most advanced applications, this directive is not commonly used because escape analysis is usually handled automatically by the compiler and works well.

Note that misuse of `//go:noescape` may lead to program errors because it prevents the compiler from performing usual escape analysis. If a variable actually needs to escape to the heap, but is incorrectly marked as `noescape`, it may cause the program to crash or otherwise have unpredictable behavior. Therefore, this directive should only be used if its impact is fully understood and such optimization is truly required.

## `go:norace`

`go:norace` is a compiler directive in the Go language that is used to disable race condition detection for a specific function or block of code. When using Go's race detector, go:norace can be used to mark areas of code where you are confident that race conditions will not occur. This instruction is mainly used for performance optimization, because race detection may increase the running time and memory usage of the program.

In practice, the `go:norace` directive should be used with great caution, as it will cause this part of the code to skip the race detector. If go:norace is used incorrectly, it can cause race conditions to be hidden, introducing hard-to-find bugs into your program.

For example, if you have a function that you are very sure is safe in a concurrent environment and you want to optimize performance, you can mark the function with `go:norace`:

```go
//go:norace
func myFunction() {
     // Function implementation
}
```

This tells the Go compiler not to do race checking in this function. But, again, this requires you to be very confident that the function will not cause any race conditions in a concurrent environment. In most cases, it's generally a safer option to avoid using such directives unless absolutely necessary.

## `go:notinheap`

The `go:notinheap` directive is a compiler directive that tells the Go compiler not to allocate types on the heap. This directive is particularly useful for avoiding garbage collection overhead for certain types of objects. When you use this directive, it means that instances of the type it applies to can only be allocated on the stack or in global variables.

## `go:yeswritebarrierrec`

`go:yeswritebarrierrec` is a Go language compiler directive used to control garbage collection (GC) related behavior. In Go, the compiler and runtime system use write barriers to help the garbage collector accurately track object references. This is to ensure that during garbage collection, objects that are still referenced are not incorrectly collected.

Normally, write barriers are managed automatically, but in some special cases, developers may need to manually control the enabling or disabling of write barriers. This is what the `go:yeswritebarrierrec` directive is for.

- Use the `go:yeswritebarrierrec` directive: When you use this directive in your code, you tell the Go compiler to enable write barrier logging in the following block of code. This means that memory writes in this code will be logged by a write barrier to help the garbage collector track object references correctly.
- Application scenarios: This directive is usually used in very low-level code, especially those that interact closely with the runtime system or the garbage collector. It is rarely needed in normal application development.
- Note: `go:yeswritebarrierrec` is an advanced feature. Improper use of it may cause unpredictable problems in the program. Therefore, it is not recommended to use it unless you know exactly what you are doing.

This instruction reflects the Go language's flexible control over the underlying memory management and garbage collection mechanisms, but it also requires developers to have a deep understanding of memory management and garbage collection principles.

## `go:nowritebarrierrec`

```
//go:nowritebarrierrec

```

This directive indicates that the compiler will generate an error when it encounters a write barrier and allows recursion. That is, other functions called by this function will also report errors if they have write barriers.

To put it simply, it is to deal with write barriers and prevent them from endless loops.

### Case

```go
//go:nowritebarrierrec
funcgcFlushBgCredit(scanWorkint64) {
...
}
```

## refer to

- ChatGpt
- C++ template metaprogramming: [https://en.wikipedia.org/wiki/Template_metaprogramming](https://en.wikipedia.org/wiki/Template_metaprogramming)
- Go 1.4: [https://go.dev/blog/generate](https://go.dev/blog/generate)
- samplegentool: [https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/samplegentool](https://github.com/eliben/code-for-blog /tree/master/2021/go-generate-guide/samplegentool)
- mymod: [https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/mymod](https://github.com/eliben/code-for-blog /tree/master/2021/go-generate-guide/mymod)
- Official documentation: [https://pkg.go.dev/cmd/go#hdr-Generate_Go_files_by_processing_source](https://pkg.go.dev/cmd/go#hdr-Generate_Go_files_by_processing_source)
- stringer: [https://pkg.go.dev/golang.org/x/tools/cmd/stringer](https://pkg.go.dev/golang.org/x/tools/cmd/stringer)
- RoundingMode: [https://pkg.go.dev/math/big#RoundingMode](https://pkg.go.dev/math/big#RoundingMode)
- In the small example module: [https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/stringerusage](https://github.com/eliben/code- for-blog/tree/master/2021/go-generate-guide/stringerusage)
- Here it is: [https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/insourcegenerator](https://github.com/eliben/code-for- blog/tree/master/2021/go-generate-guide/insourcegenerator)
- In 1.8: [https://tip.golang.org/doc/go1.8#tool_yacc](https://tip.golang.org/doc/go1.8#tool_yacc)
- This submission from Rob Pike: [https://go-review.googlesource.com/c/go/+/8091/](https://go-review.googlesource.com/c/go/+/8091/ )
- shell escaping: [http://www.gnu.org/savannah-checkouts/gnu/bash/manual/bash.html#Quoting](http://www.gnu.org/savannah-checkouts/gnu/bash/ manual/bash.html#Quoting)
