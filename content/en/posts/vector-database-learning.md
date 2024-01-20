---
title: 'Vector Database Learning'
ShowRssButtonInSectionTermList: true
cover.image: 'https://img-blog.csdnimg.cn/b37cafc66d9244f39b7fe8ab61fdb32a.png#pic_center'
date : 2024-01-20T12:57:15+08:00
draft : false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
  - ai
  - database
categories:
  - Development
  - Blog
  - AI
---

# Vector database learning

I learned rust today and found that rust is a very suitable language for writing databases. I found a treasure project tikv. Its github project address is https://github.com/tikv/tikv. It is a very active project, but today I The topic is vector database in the field of AI. Without further ado, let’s get started right away.

## **prerequisites**

0.1 Introduction to basic knowledge: Understand the basic definition of vector database and its difference from traditional database.
0.2 Data Structure Basics: Learn vectors and other basic data structures, and how to represent and manipulate these structures in databases.
0.3 Introduction to Linear Algebra: Introduction to vector operations, including vector addition, subtraction and dot multiplication.
0.4 Similarity measures: Learn how to calculate similarity between vectors, such as cosine similarity.
0.5 Basics of Database Index: Introduces the basic concepts of database index, especially its application in vector databases.
0.6 Preliminary Search Algorithms: Learn basic search algorithms and understand how to perform effective searches in large data sets.
0.7 Application case studies: Study the application of vector databases in different fields (such as recommendation systems, image recognition).

## **Main courses**

1.1 Vector Database Deep Dive: Explore the advanced features and benefits of vector databases.
1.2 Algorithm Exploration: Gain an in-depth understanding of the key algorithms used in vector databases, including indexing and search algorithms.
1.3 Database Design: Learn how to design and implement an effective vector database architecture.
1.4 Integrating Machine Learning: Learn how to integrate vector databases with machine learning models to improve performance and functionality.
1.5 Actual case analysis: Deepen your understanding of vector database applications by analyzing actual cases.
1.6 Advanced mathematical concepts: In-depth study of relevant advanced mathematical concepts, such as vector representation and operations of high-dimensional space.
1.7 Project practice: Carry out a small project to practice the design and application of vector database.
1.8 Review and Assessment: Review what you have learned and use assessments to test understanding and application.

## 0.1 Introduction to basic knowledge

Vector databases are a special type of database that use mathematical vectors to represent and store data. This is very different from traditional databases, which typically use tables and rows to organize data.

1. **Definition of vector database** 💡

     - How do vector databases work?

         In a vector database, data is stored and processed in the form of vectors, so the original non-vector data needs to be converted into vector representation. Data vectorization refers to the process of converting non-vector data into vector form. Through data vectorization, efficient similarity calculation and query in vector database are realized. In addition, vector databases use different retrieval algorithms to speed up vector similarity searches, such as `KD-Tree`, `VP-Tree`, `LSH` and `Inverted Index`, etc. In practical applications, algorithm selection and parameter tuning need to be carried out according to specific scenarios. The specific algorithm chosen depends on the characteristics of the data set, data volume and query requirements, as well as the requirements for search accuracy and efficiency.

     - How do they use vectors to store and process data?

         Vector databases use mathematical vectors to store and process data, which is significantly different from traditional database storage methods. Key steps and concepts here include:

         1. **Convert data to vector** 🔄
             - In a vector database, data is first converted into the form of mathematical vectors. For example, text data can be converted into vectors through natural language processing techniques, and image data can be converted into vectors through deep learning models.
         2. **Vector representation** 📈
             - Each data item is represented as a vector, which has its specific position and direction in multidimensional space. These vectors are usually in a high-dimensional space, with each dimension representing a feature of the data.
         3. **similarity search** 🔍
             - A key feature of vector databases is similarity search. It finds similar items by comparing the distance between vectors of data items (for example, using cosine similarity). This is particularly effective for processing complex queries and large data sets.
         4. **Indexing and retrieval** 📚
             - Vector databases use efficient indexing mechanisms to quickly retrieve and access data. These indexes help the database quickly locate the vectors involved in the query, thus speeding up searches.
         5. **Machine Learning Integration** 🤖
             - Many vector databases can be tightly integrated with machine learning models. This allows the database to not only store data, but also directly process and analyze data through models, thereby providing more advanced data processing and analysis capabilities.

         By using vectors to represent and process data, vector databases are able to handle more complex and richer data types while providing faster search and retrieval performance. This makes them increasingly important in today’s data-driven world.

2. **Comparison with traditional database** 📊

     - What are the differences in structure and function between vector databases and traditional databases?
         1. **Data storage method** 🗄️
             - **Traditional Database**: Typically stores data in the form of rows and columns, similar to a spreadsheet. This structure is ideal for storing structured data such as text and numbers.
             - **Vector Database**: Use mathematical vectors to represent data. Each data point is a vector that can be represented in a high-dimensional space. This method is suitable for storing unstructured data such as images, audio and text.
         2. **Query and Search** 🔍
             - **Traditional database**: Focus on precise queries, such as searching by specific keywords or numerical values.
             - **Vector Database**: Good at fuzzy or similarity searches. For example, you can find images that are similar to a given image, or find semantically similar text.
         3. **Performance and Optimization** 🚀
             - **Traditional database**: Excellent performance when processing large amounts of structured queries.
             - **Vector Database**: Specially optimized for handling complex similarity searches, which is very efficient for large-scale unstructured data.
     - In what situations is it more appropriate to use a vector database?
         1. **Unstructured Data Processing** 🖼️
             - When the data is unstructured, such as images, videos, or natural language text, vector databases can store and retrieve this data more efficiently.
         2. **Complex Similarity Search** 🔎
             - When complex similarity searches need to be performed, such as recommendation systems or pattern recognition, vector databases provide a more efficient solution.
         3. **Big Data Application** 💾
             - Vector databases are ideal for applications that require processing and analyzing large data sets, especially those that require fast and efficient search capabilities.
         4. **Machine Learning and Artificial Intelligence** 🤖
             - The integration of vector databases with the fields of machine learning and artificial intelligence, making them excellent at processing data from these fields.

3. **Vector Database & AI**

     - Why are vector databases important for AI?

         Because it has inherent advantages in processing high-dimensional data, from image processing to recommendation systems, vector databases are undoubtedly the heroes behind the scenes. Its main functions include:

         - Management: The vector database processes data in the form of raw data and can effectively organize and manage data to facilitate the application of AI models.
         - Storage: Able to store vector data, including high-dimensional data required by various AI models.
         - Retrieval: Vector databases are particularly good at retrieving data efficiently. This feature ensures that the AI model can quickly obtain the data it needs when it is needed. This is also an important reason why vector databases can be used in some recommendation systems or retrieval systems.

         Therefore, we say that the vector database allows AI to have memory. This memory is not only record storage, but also retrieval and management. Just like human memory, we can always recognize who this person is through the graduation photos of our classmates; we often reminisce about the past together when chatting with friends.

**Eight open source projects for vector databases (listed for later learning):**

- Milvus: https://github.com/milvus-io/milvus
- Faiss: https://github.com/facebookresearch/faiss
- Annoy: https://github.com/spotify/annoy
- Nmslib: https://github.com/nmslib/nmslib
- Qdrant: https://github.com/qdrant/qdrant
- Chroma: https://github.com/chroma-core/chroma
- Lancedb: https://github.com/lancedb/lancedb
- Vectra: https://github.com/Stevenic/vectra

## 0.2 Data structure basics

1. **Basics of Vectors** 🧮
     - **Definition**: In programming and data science, a vector is usually viewed as a one-dimensional array containing a sequence of elements. Each element can be a number, character, or other data type.
     - **Operations**: Basic vector operations include adding and removing elements, accessing specific elements, traversing all elements, etc.
     - **Mathematical Perspective**: From a mathematical perspective, a vector can be represented as a quantity with direction and magnitude, especially in physics and engineering.
2. **Other basic data structures** 📂
     - **Array**: A basic data structure used to store a sequence of elements of the same type, arranged continuously in memory.
     - **Linked List**: Consists of a series of nodes, each node contains a data part and a link to the next node.
     - **Stack and Queue**: The stack is a last-in-first-out (LIFO) structure, while the queue is a first-in-first-out (FIFO) structure.
     - **Hash table**: A data structure that accesses data by key, providing fast data insertion and search.
3. **Representation and operation in database** 🗄️
     - **Relational Database**: In a relational database, the data structure is usually represented as a table, with each row representing a record and each column representing a field.
     - **Non-relational database**: In a non-relational database, the data structure can be more flexible, such as document storage, key-value pairs, or graph structures.
     - **Vector Database**: In a vector database, data is typically represented as vectors, which are indexed and retrieved in the database for efficient similarity searches.

## **0.3 Introduction to Linear Algebra: Vector Operations**

### **Vector addition 🔄**

- **Concept**: Vector addition is adding the corresponding elements of two vectors.
- **Example**: If v1 = [1, 2, 3] and v2 = [4, 5, 6], then their sum is [1+4, 2+5, 3+6] = [5, 7, 9].
- **Geometry Meaning**: Geometrically, vector addition can be viewed as placing the tail of one vector at the head of another vector, and then forming a new vector.

### **Vector subtraction ➖**

- **Concept**: Vector subtraction is subtracting the corresponding elements of one vector from another vector.
- **Example**: If v1 = [4, 5, 6] and v2 = [1, 2, 3], then their difference is [4-1, 5-2, 6-3] = [3, 3, 3].
- **Geometry Meaning**: Geometrically, vector subtraction can be viewed as going from the head of one vector to the head of another vector.

### **Dot product (inner product) ⚫**

- **Concept**: Dot multiplication is to multiply the corresponding elements of two vectors and then add the results.

- **Formula**: If v1 = [a1, a2, a3] and v2 = [b1, b2, b3], then their dot product is a1*b1 + a2*b2 + a3*b3.

- **Example**: For v1 = [1, 2, 3] and v2 = [4, 5, 6], the dot product result is 1*4 + 2*5 + 3*6 = 32.

- **Geometric meaning**: The dot product can be expressed geometrically as a function of the angle between two vectors. If the dot product is zero, then the two vectors are perpendicular.

- ****Calculation skills of dot product (inner product)****

     **Direct Calculation Method**

     - **Method**: Multiply the corresponding elements of two vectors and add the results.
     - **Example**: For v1 = [a1, a2, a3] and v2 = [b1, b2, b3], the dot product is a1*b1 + a2*b2 + a3*b3.

     **Using the Cosine Theorem**

     - **Background**: Dot product can be used to calculate the angle between two vectors.
     - **Formula**: If |v1| and |v2| are the lengths of two vectors respectively, and θ is the angle between them, then the dot product v1·v2 = |v1|* |v2|* cos(θ ).- **Application**: This method is particularly useful when determining whether two vectors are orthogonal (perpendicular), because if cos(θ) = 0, the dot product results in zero.

     **Using matrix multiplication**

     - **Method**: Treat one vector as a 1×n matrix and the other as an n×1 matrix, then do matrix multiplication.
     - **Example**: Treat v1 = [1, 2, 3] as a 1×3 matrix and v2 = [4, 5, 6] as a 3×1 matrix. Their matrix multiplication results are dot products. result.

     **Implementation in Programming**

     - **Python code example**:

         ```python
         def dot_product(v1, v2):
             return sum(x*y for x, y in zip(v1, v2))
         ```

     - **DESCRIPTION**: This function pairs the elements of two vectors via the **`zip`** function, then calculates the product of the elements of each pair and adds them.

     **Geometry Applications**

     - **Projection**: The dot product can be used to calculate the length of the projection of one vector onto another vector.
     - **Angle calculation**: Through dot product and vector length, the angle between two vectors can be calculated.

## **0.4 similarity measure: cosine similarity**

### **What is cosine similarity? **

- **Definition**: Cosine similarity is a measure of how similar two vectors are in direction, regardless of their size.
- **Calculation method**: Calculated by measuring the cosine of the angle between two vectors. The closer the cosine value is to 1, the more similar the two vectors are.

### **How to calculate cosine similarity? **

1. **Formula**:

     - Cosine similarity is defined as the dot product of two vectors A and B divided by the product of their respective lengths.
     - Formula: `cos(θ) = (A·B) / (||A||*||B||)`
     - Where A·B represents the dot product of A and B, `||A||` and `||B||` are the Euclidean lengths (or norms) of vectors A and B, which means ** The straight-line distance from the origin to its endpoints. **

2. **Calculation steps**:

     - Computes the dot product of two vectors.
     - Calculate the length (or module) of each vector separately.
     - Divide the dot product by the product of the two lengths.

3. **Python code example**:

     ```python
     import math
    
     def cosine_similarity(v1, v2):
         dot_product = sum(a*b for a, b in zip(v1, v2))
         magnitude_v1 = math.sqrt(sum(a*a for a in v1))
         magnitude_v2 = math.sqrt(sum(b*b for b in v2))
         return dot_product / (magnitude_v1 * magnitude_v2)
    
     ```

### **Application of cosine similarity**

- **Text Analysis**: In natural language processing, cosine similarity is often used to compare the similarity of document or word vectors.
- **Recommendation System**: Used to compare feature vectors of users or items to find similar users or recommend similar items.
- **Image recognition**: In image processing, it can be used to compare the similarity of image feature vectors.

## **0.5 Database Index Basics**

### **What is a database index? **

- **Definition**: A database index is a data structure that helps quickly locate specific data in a database table without having to search the entire table.
- **Function**: Improve the speed of database query, similar to the table of contents of a book.

### **Type of index**

- **Primary key index**: used to maintain the uniqueness of records in the table. Each table can have a primary key index.
- **Auxiliary Index**: Non-primary key index used to speed up data access.
- **Compound Index**: An index built on multiple columns.

### **How indexes work**

- **Storage Structure**: Most database indexes, such as B-trees (especially B+ trees), optimize data retrieval through specific data structures.
- **Query Optimization**: When performing query operations, the database can use indexes to quickly locate data instead of scanning the entire table row by row.

### **Index in vector database**

- **Speciality**: In vector databases, the establishment and use of indexes are different from traditional databases because they deal with high-dimensional vector data.
- **Approximate Search**: Indexes in vector databases are typically designed for fast approximate nearest neighbor (ANN) searches. This means they can quickly find the data points that are most similar to the query vector.
- **Indexing technology**: For example, use techniques such as KD trees, ball trees, or product quantification to effectively organize and retrieve high-dimensional data.

### **Index optimization and challenges**

- **Balance**: When implementing indexes, a balance needs to be found between query performance and index maintenance costs.
- **Update**: When the database table is updated, the index needs to be updated accordingly, which can be a time-consuming operation.
- **Space Requirements**: Indexes require additional storage space.

- Approximately

---

### Approximate nearest neighbor (ANN) search

1. **Definition of ANN** 💡
     - Approximate nearest neighbor search is a method of quickly finding the data points in large data sets that are most similar to a given query point.
     - Unlike exact nearest neighbor search, ANN search focuses more on speed than complete accuracy.
2. **Why is ANN important? ** 🌟
     - Exact nearest neighbor searches can be very slow and impractical when dealing with large-scale data sets.
     - ANN provides a practical solution that allows obtaining approximate results within an acceptable time.
3. **ANN Algorithm** 🤖
     - There are various algorithms that can be used to implement `ANN` search, such as `KD` tree, locality sensitive hashing (LSH), product quantization, etc.
     - These algorithms each have their own characteristics in how they balance search speed and accuracy.
4. **Application in vector database** 🔍
     - Vector databases utilize ANN search to efficiently handle similarity queries, especially in high-dimensional data environments.
     - This is critical for applications such as recommender systems, image retrieval and language processing.

## **0.6 Preliminary search algorithm**

### **Classification of basic search algorithms**

1. **Linear Search**
     - **Definition**: Check each element in the data set one by one until the required element is found.
     - **Applicable scenarios**: For small or unsorted data sets.
2. **Binary search**
     - **Definition**: In a sorted data set, reduce the search range by splitting the search interval in half.
     - **Applicable scenarios**: Large and sorted data sets.
3. **Depth First Search (DFS)**
     - **Definition**: A search algorithm for a tree or graph that searches deeply along a path until it reaches the end, then backtracks.
     - **Applicable scenarios**: Problems that require exploring all possible paths, such as maze solutions.
4. **Breadth First Search (BFS)**
     - **Definition**: A search algorithm for trees or graphs that searches hierarchically, visiting neighboring nodes first.
     - **Applicable scenarios**: Find the shortest path or a solution close to the root.

### **How to perform efficient searches in large data sets? **

1. **Selection of data structure**
     - Select appropriate data structures based on data type and search requirements, such as hash tables, tree structures, etc.
2. **Indexing and Preprocessing**
     - Index or preprocess data, such as sorting, to speed up searches.
3. **Parallel processing**
     - Where possible, use parallel processing to speed up searches, especially when working with large data sets.
4. **Approximate method**
     - For some applications, approximation algorithms can be used to speed up searches, sacrificing some accuracy.

### **Practical Case**

- Design a simple search algorithm to find specific elements in an array.
- Find elements in a sorted array using binary search algorithm.

## **0.7 Application Case Study: Practical Application of Vector Database**

### **1. Recommendation system**

- **Overview**: Recommender systems are designed to recommend items or content to users that may be of interest to them.
- **The role of vector database**:
     - Users and items (e.g. movies, books) can be represented by feature vectors.
     - Conduct similarity searches using vector databases to discover similar items that users may like.
- **Example**: An online shopping website recommends similar products, or a music streaming service recommends similar songs.

### **2. Image recognition**

- **Overview**: Image recognition refers to recognizing and processing information in images, such as identifying objects, faces, or scenes.
- **The role of vector database**:
     - Images are converted into feature vectors through deep learning models.
     - Vector databases are used to store and quickly retrieve these image feature vectors to identify similar images or patterns.
- **Example**: Facial recognition or medical image analysis in security surveillance systems.

### **3. Language processing**

- **Overview**: Natural language processing involves understanding and interpreting human language.
- **The role of vector database**:
     - Textual data (such as documents, social media posts) can be converted into vectors through word embedding models.
     - Vector databases are used to perform text similarity analysis, such as searches for related documents or sentiment analysis.
- **Example**: Chatbot understanding user queries or social media trend analysis.

### **4. Data analysis and scientific research**

- **Overview**: Large data sets are increasingly common in scientific research and data analysis.
- **The role of vector database**:
     - High-dimensional data (such as genetic data, scientific simulation results) are stored in vector databases.
     - Used to quickly query and analyze data sets, looking for patterns or trends.
- **Examples**: Genomics studies or large-scale climate model analyses.

<aside>
💡 Next comes the formal learning session of our vector database


</aside>

## **1.1 Vector database in-depth**

### **Advanced Features**

1. **High-dimensional data processing capabilities**
     - Vector databases are designed to efficiently manage and query high-dimensional data, which is challenging in traditional databases.
     - They are able to handle complex data structures produced by deep learning models etc.
2. **Approximate nearest neighbor search (ANN)**
     - Vector databases are usually equipped with advanced ANN search algorithms, making them faster and more accurate when searching for similar items in high-dimensional space.
     - This is critical for real-time data analysis and complex query processing.
3. **Automatic Indexing and Optimization**
     - Many vector databases can automatically index stored data to optimize query performance.
     - Indexing strategies are usually optimized for specific types of queries and data patterns.

### **Advantage**

1. **Query efficiency**
     - For queries involving complex pattern matching and similarity searches, vector databases provide significant performance advantages.
     - They can quickly find the most relevant results in large-scale data sets.
2. **Flexibility and Scalability**
     - Vector databases can flexibly handle a variety of data types, from text to images to complex multi-dimensional data.
     - Their structure is adaptable and can be easily expanded to accommodate growing data volumes.
3. **Machine Learning and Artificial Intelligence Integration**
     - The integration of vector databases with machine learning models provides data scientists and developers with powerful tools for building intelligent applications.
     - They enable complex data analysis and processing to be performed directly at the database level.

### **Application scenario examples**

- **Personalized Recommendation System**: Use the feature vectors of users and products to quickly find the most matching recommendations.
- **Image and Video Search**: Quickly find visually similar images or videos in large image libraries.
- **Bioinformatics**: Processing and analyzing large amounts of gene and protein sequence data.

## **1.2 Algorithm Exploration**

### **Index algorithm**

1. **KD tree (K-dimensional tree)**
     - A data structure used to organize points in K-dimensional space.
     - Suitable for low-dimensional data, but performance may decrease as the dimensionality increases.
2. **Ball Tree**
     - A tree-based data structure for efficiently organizing and querying high-dimensional data.
     - Each node defines a hypersphere containing its children.
3. **Product Quantization**
     - Compress data by dividing a high-dimensional space into smaller, more manageable subspaces.
     - Approximate nearest neighbor search for large-scale high-dimensional data.
4. **Local Sensitive Hashing (LSH)**
     - A probabilistic algorithm for fast approximate similarity searches.
     - GeneralSimilar items are mapped into the same "bucket" for quick retrieval.

### **Search algorithm**

1. **Approximate Nearest Neighbor (ANN) Search**
     - Designed for efficient processing of similarity searches in high-dimensional data.
     - Improve search speed at the expense of certain accuracy.
2. **Inverted Index**
     - Commonly used in text retrieval to store the position of terms in a document.
     - Suitable for searches based on text content.
3. **Graph search algorithm**
     - Such as HNSW (Hierarchical Navigation Small World), used to organize data points for efficient nearest neighbor search.
     - Suitable for large-scale, dynamically changing data sets.

### **Considerations for Algorithm Selection**

- **Data Dimension**: Different algorithms are suitable for data of different dimensions.
- **Data volume**: The size of the data volume directly affects the selection and performance of the algorithm.
- **Balance of Query Efficiency and Accuracy**: Find the right balance between speed and accuracy based on application requirements.

**Some questions 🔕**

- How are different data dimensions controlled & why use high-latitude data?

     First of all, we know how dimensions are defined. Human beings live in three dimensions, **three-dimensional space** (also known as **three-dimensional space**, **three-dimensional**, **3D**). In daily life, we can Refers to the space composed of three dimensions: length, width and height, and often refers to the three-dimensional [Euclidean space] (https://zh.wikipedia.org/wiki/%E6%AC% A7%E5%87%A0%E9%87%8C%E5%BE%97%E7%A9%BA%E9%97%B4). Some people also say that time should be added to our current space, so it is called **four-dimensional space-time**.

     **The meaning of dimensions in large language models and vector databases**

     1. **Definition of dimensions**:
         - In large language models and vector databases, "dimension" refers to the number of features of a data point. Each dimension represents a specific aspect or attribute of the data.
     2. **High-dimensional data**:
         - When data points contain a large number of features, we say that the data is high-dimensional. For example, a word vector may have hundreds or thousands of dimensions, each encoding some linguistic or semantic information.
         - In deep learning, layers of a model may generate high-dimensional feature spaces to represent complex patterns and relationships.
     3. **Low-dimensional data**:
         - In contrast, if a data point has only a few features, we call it low-dimensional. For example, a simple data set might contain only a few dimensions, such as length, width, and height.

     **Why use high-dimensional data? **

     1. **Information-rich**:
         - High-dimensional data can contain richer information. In language models, high-dimensional word vectors can capture more subtle semantic and linguistic differences.
     2. **Capture Complexity**:
         - Complex patterns and relationships often require more dimensions to accurately represent. In machine learning, high-dimensional feature spaces allow models to learn and represent complex input data structures.

     **How to control and process high-dimensional data? **

     1. **Dimensionality reduction technology**:
         - Dimensionality reduction techniques such as principal component analysis (PCA) or t-SNE are used to reduce the dimensionality of the data while retaining important information as much as possible.
         - This helps simplify model and data visualization.
     2. **Efficient Algorithm**:
         - For high-dimensional data, specific efficient algorithms are developed, such as the approximate nearest neighbor search algorithm, to improve computational efficiency without sacrificing too much accuracy.

- Why do vector databases typically use the Approximate Nearest Neighbor (ANN) search algorithm instead of other methods like the "Approximate Depth Algorithm"?

     **The Reason for Approximate Nearest Neighbor (ANN) Search**

     1. **Challenges of high-dimensional data**:
         - Vector databases are often used to process high-dimensional data, such as those generated by deep learning models.
         - In high-dimensional spaces, traditional depth searches (such as depth-first searches) are inefficient because they require traversing a large portion of the data set to find the nearest neighbor.
     2. **"Curse of Dimension"**:
         - As the dimension increases, the distance between any two points becomes more and more similar (this is called "[wiki: Curse of Dimension](https://zh.wikipedia.org/wiki/%E7%BB% B4%E6%95%B0%E7%81%BE%E9%9A%BE)”).
         - In this case, finding the nearest neighbor exactly becomes impractical, so approximate methods are more efficient.
     3. **Balance between speed and accuracy**:
         - ANN search provides an efficient balance between speed and accuracy.
         - It allows returning "good enough" results within an acceptable time, which is crucial for large-scale real-time applications.

     **Why not "approximate depth algorithm"? **

     - **Limitations of deep search**:
         - Deep search methods (such as depth-first search) work better in low-dimensional data or specific types of structured data.
         - For randomly distributed high-dimensional data, deep search may incur huge performance overhead because it may require traversing the entire data set to find an approximately optimal solution.
     - **Differences in search types**:
         - Deep search is not directly related to the concepts of "approximation" or "nearest neighbor". It focuses more on traversing deeply within a data structure (like a graph or a tree) rather than finding the closest data point.

- What problems will the increase in dimensionality bring?

     Often referred to as the "Curse of Dimensionality" in the fields of data science and machine learning, it brings a series of problems and challenges.

     **Main problems caused by the curse of dimensionality**

     1. **Data Sparsity**
         - In high-dimensional space, data points may be very scattered, resulting in "empty space" around each data point. This makes analysis based on proximity points, such as clustering or nearest neighbor searches, difficult. (imagine 2D to 3D)
     2. **Insufficient sample coverage**
         - As the dimensionality increases, the required sample size increases exponentially to maintain data density. In practical applications, it is difficult to obtain a sufficient number of samples to cover high-dimensional space.
     3. **Computational complexity increases**
         - In high-dimensional space, the computational cost of many algorithms (especially distance-based algorithms) will increase significantly, resulting in reduced efficiency.
     4. **Difficulty of Dimensionality Reduction**
         - Although dimensionality reduction techniques (such as PCA) can help alleviate the curse of dimensionality, important information may be lost during the dimensionality reduction process, and dimensionality reduction itself is a challenge. (Think of a two-way foil)
     5. **Model overfitting**
         - In high-dimensional spaces, models are more likely to overfit, especially when the number of samples is small relative to the number of features. This means that a model may perform well on training data but perform poorly on new, unseen data.
     6. **Distance measure invalid**
         - In high-dimensional spaces, traditional distance measures (such as Euclidean distance) may fail because the distance differences between different points become tiny.

     **Strategies for solving the Curse of Dimension**

     1. **Dimensionality reduction technology**
         - Use dimensionality reduction techniques such as PCA and t-SNE to reduce the number of features while retaining important information as much as possible.
     2. **Feature Selection**
         - Retain only the most important features through feature selection methods to reduce dimensionality.
     3. **Increase sample size**
         - Increase data sample size as much as possible to improve data coverage in high-dimensional space.
     4. **Use specific algorithm**
         - On high-dimensional data, use those algorithms designed specifically for high dimensions, such as tree-based methods or locality-sensitive hashing.

## **1.3 Database design: vector database architecture**

### **Understand the core requirements of vector database**

1. **Efficient data storage**:
     - Design storage structures to efficiently store and retrieve high-dimensional data.
     - Consider compression and optimized storage of data to reduce space requirements.
2. **Fast search capabilities**:
     - Integrate efficient search algorithms such as approximate nearest neighbor search for fast query processing.
     - Ensure that the query process can quickly locate and retrieve relevant data.
3. **Scalability**:
     - The architecture should be able to scale horizontally as data volume increases.
     - Consider using distributed systems and load balancing.

### **Key steps in vector database design**

1. **Data model definition**:
     - Determine how to represent and store vector data.
     - Consider the dimensions, types of data and how to best encode and index that data.
2. **Index Strategy**:
     - Choose an appropriate indexing method such as KD tree, ball tree or product quantization.
     - Indexes should optimize search performance, taking into account the cost of updates and maintenance.
3. **Query processing**:
     - Design query processing mechanisms, including how search queries are parsed and executed.
     - Optimize query execution plans to reduce response time.
4. **Data distribution and partitioning**:
     - For large data sets, consider data distribution and partitioning strategies to improve performance and scalability.
     - Consider the physical storage of data, including how it is distributed across multiple nodes or servers.
5. **Fault Tolerance and Redundancy**:
     - Ensure the database is fault-tolerant, such as through data replication and backup mechanisms.
     - Design redundant systems to cope with hardware failure or data loss.

### **Performance and Security Considerations**

- **Performance Optimization**:
     - Continuously monitor and optimize performance, including query optimization, hardware resource management, etc.
- **Security and Privacy**:
     - Implement appropriate security measures to protect data from unauthorized access and attacks.

## **1.4 Integrated Machine Learning**

### What is machine learning?

Machine learning is a technology that enables computers to learn from data and make decisions or predictions. It is a branch of artificial intelligence that focuses on developing algorithms that allow computers to automatically improve their performance based on data provided.

### Core features:

1. **Automatic Learning**:
     - Computer systems improve their performance by analyzing and learning from data, rather than through explicit programming.
2. **Pattern Recognition**:
     - Machine learning models are able to identify complex patterns and relationships that may be difficult for humans to see or understand.
3. **Forecasting and Decision Making**:
     - Based on historical data, models can make predictions or make decisions, such as recommendation systems, stock price predictions, etc.

### **What is a machine learning model? **

A machine learning model is the result of learning from data through a machine learning algorithm. It is a mathematical representation of the data pattern. Simply put, a model is an abstraction of data used for prediction or decision-making.

### Build process:

1. **Training**:
     - Use large amounts of data and algorithms to "train" the model so that it can recognize patterns and relationships in the data.
     - The training process involves adjusting model parameters to minimize prediction errors.
2. **Verification and Testing**:
     - Validate and test the model using data not involved in training to ensure its accuracy and generalization ability.
3. **Application**:
     - The trained model can then be applied to new data for prediction or decision support.

### type:

- **Supervised Learning**: Models learn based on labeled training data, such as classification and regression tasks.
- **Unsupervised Learning**: Models look for patterns on unlabeled data, such as clustering and association rule learning.
- **Reinforcement Learning**: The model learns strategies to achieve goals through interaction with the environment.

Feature vectors generated by machine learning models are a very important concept, especially in the fields of deep learning and natural language processing. These feature vectors are able to capture and represent complex patterns and characteristics of the data, allowing us to conduct deeper analysis and more efficient data processing. 🔍🤖

### **Concept of feature vector**

1. **Definition**:
     - In machine learning, a feature vector is a numerical representation of raw data, usually a set of numbers converted by some algorithm.
     - They capture key features of raw data that are essential for data processing and analysis tasks.
2. **Generation method**:
     - Deep learning models, such as convolutional neural networks (CNN) or recurrent neural networks (RNN), are often used to generate feature vectors.
     - These models are able to extract complex patterns and features from raw data (such as images, text or sounds) and convert them into dense numerical vectors.

### **Application of feature vectors**

1. **Natural Language Processing (NLP)**:
     - In NLP, word embedding models (such as Word2Vec or BERT) convert words or phrases into feature vectors that capture the semantic and syntactic information of the language.
2. **Image processing**:
     - In image processing, CNNs are used to convert images into feature vectors that represent key visual patterns and objects in the image.
3. **Recommendation System**:
     - Feature vectors are used to represent the characteristics of users and items,To facilitate similarity matching and personalized recommendations.
4. **Data clustering and classification**:
     - With feature vectors, data can be clustered and classified more efficiently because they provide a rich and information-dense representation of the data.

### **Advantages of eigenvectors**

- **Information dense**: Feature vectors condense the key information of the original data, making it suitable for various machine learning and data analysis tasks.
- **Flexibility**: Can be used with various types of data such as text, images and sounds.
- **Comparability**: Feature vectors make comparisons between different data points possible, especially when performing similarity searches.

### **challenge**

- **Dimension Selection**: Determining the appropriate size of feature vectors is a challenge as it requires a balance between information richness and computational efficiency.
- **Interpretability**: Feature vectors generated by deep learning models may lack intuitive interpretability.

---

### How to integrate machine learning

In the supervised learning algorithm of machine learning, our goal is to learn a stable model that performs well in all aspects, but the actual situation is often not so ideal, and sometimes we can only get multiple preferred models ( Weakly supervised models perform better in some aspects). Ensemble learning is to combine multiple weak supervision models here in order to obtain a better and more comprehensive strong supervision model. The underlying idea of ensemble learning is that even if a certain weak classifier gets an incorrect prediction, other weak classifiers can also correct the error. Correct back.

- Ensemble methods are meta-algorithms that combine several machine learning techniques into a predictive model to achieve the effect of reducing variance (bagging), bias (boosting), or improving prediction (stacking).

- Ensemble learning has good strategies on data sets of all sizes.

- Large data set: Divide it into multiple small data sets and learn multiple models for combination

- Small data set: Use the `Bootstrap` method for sampling to obtain multiple data sets, train multiple models separately and then combine them

     - Bootstrap sampling method

         In **statistics**, **Bootstrap Method** (Bootstrap Method, Bootstrapping, or **Bootstrap Sampling Method**, **Boot Pulling Method**) is a method with replacement from a given training set. Uniform sampling, that is, whenever a sample is selected, it is equally likely to be selected again and added to the training set again. The self-help method was published by Bradley Efron in "Annals of Statistics" in 1979. When [sample](https://zh.wikipedia.org/wiki/%E6%A8%A3%E6%9C%AC_(%E7%B5%B1%E8%A8%88%E5%AD%B8)) From a population that can be described by a normal distribution , its [sampling distribution](https://zh.wikipedia.org/wiki/%E6%8A%BD%E6%A0%B7%E5%88%86%E5%B8%83) is a normal distribution; but When the population from which the sample comes cannot be described by a normal distribution, [Asymptotic Analysis Method](https://zh.wikipedia.org/w/index.php?title=%E6%BC%B8%E9%80% B2%E5%88%86%E6%9E%90%E6%B3%95&action=edit&redlink=1), self-help method, etc. to analyze. Use random sampling with replacement. For small data sets, bootstrapping works well.

Collection methods can be divided into two categories:

- Sequential ensemble methods, where the base learners involved in training are generated sequentially (e.g. AdaBoost). The principle of the sequence method is to exploit the dependencies between basic learners. By assigning higher weights to incorrectly labeled samples in previous training, the overall prediction effect can be improved.
- Parallel ensemble methods, where the base learners involved in training are generated in parallel (e.g. Random Forest). The principle of parallel methods is to exploit the independence between basic learners, which can significantly reduce errors through averaging.

### **Integration of machine learning and vector database**

- Why we need the integration of machine learning and vector databases
     1. **Processing high-dimensional data**:
         - Vector databases are often used to store and process high-dimensional data, such as feature vectors generated by machine learning models.
         - Integrated machine learning can process these high-dimensional data more efficiently, extract useful information, and transform it into a usable format.
     2. **Improve search efficiency and accuracy**:
         - Machine learning models can help improve data indexing and organization, thus speeding up the query process.
         - Especially when performing complex similarity searches, such as nearest neighbor searches, the application of machine learning models can significantly improve the accuracy and efficiency of the search.
     3. **Real-time data update and learning**:
         - In a changing data environment, the integrated machine learning model can update the feature representation of the data in real time, keeping the database up to date and most relevant.
         - This is very important for application scenarios that need to dynamically reflect new information and trends.
     4. **Extended functions and application areas**:
         - Machine learning integration makes vector database more than just a data storage and retrieval tool, but a platform capable of performing complex analysis and providing deep insights.
         - It opens up new application areas, such as intelligent recommendation systems, advanced data analysis and pattern recognition, etc.
     5. **Personalized and intelligent services**:
         - Through machine learning, databases can provide more personalized and intelligent services, such as automatically adjusting search results based on user behavior and preferences.

1. **Feature extraction and conversion**
     - Convert raw data (such as text, images, sounds) into vector form, which is usually done through machine learning models (such as deep learning networks).
     - The extracted feature vectors are stored in the vector database for subsequent query and analysis.
2. **Real-time learning and updating**
     - Vector databases can integrate machine learning models to update the feature representation of data in real time.
     - This is important for applications that require dynamic learning and adaptation to new data.
3. **Intelligent query processing**
     - Leverage machine learning models to optimize query processing, for example by predicting query patterns or automatically adjusting indexing strategies.

### **Improve performance and functionality**

1. **Speed up search and retrieval**
     - Use machine learning models to improve the organization and indexing of data to speed up the search and retrieval process.
     - For example, use models to predict which data are most likely to be queried and adjust their placement in the database accordingly.
2. **Enhance data analysis capabilities**
     - Integrated models can be used to perform complex data analysis tasks such as pattern recognition, trend prediction, or anomaly detection.
     - This provides users with deeper insights and more advanced data exploration capabilities.
3. **Improve user experience**
     - Automated and optimized query processing reduces waiting time and improves user experience.
     - Provide users with more relevant and personalized results.

### **Integration Challenge**

1. **Model Management**
     - Requires effective management and maintenance of integrated machine learning models, including regular training and updates.
2. **Balance of performance and accuracy**
     - Find the best balance between query response speed and result accuracy.
3. **Resource Optimization**
     - Ensure that the integration of databases and machine learning models does not excessively consume computing and storage resources.

## **1.5 Actual case analysis**

### **Case 1: Recommendation system**

- **background**:
     - Online retailers want to recommend products to customers to increase sales and improve customer satisfaction.
- **Application**:
     - Use a vector database to store feature vectors of users and products.
     - When a user browses, the system quickly retrieves and recommends products that are most similar to the user's historical purchasing and browsing behavior.
- **result**:
     - Improved product exposure and increased sales.
     - Improve customers' shopping experience and enhance customer loyalty.

### **Case 2: Image Search Engine**

- **background**:
     - An image search engine that allows users to upload an image and find similar images.
- **Application**:
     - Each image is converted into a feature vector through a deep learning model and stored in the vector database.
     - After the user uploads the image, the system quickly searches the database to find the image with the most similar feature vector.
- **result**:
     - Users can quickly find relevant images based on visual content.
     - A valuable resource for visual artists and designers.

### **Case 3: Financial Fraud Detection**

- **background**:
     - Financial institutions need to identify and prevent fraudulent activity to protect their customers and their own interests.
- **Application**:
     - Transaction data is converted into feature vectors and stored in the vector database.
     - Analyze these vectors using machine learning models to identify unusual patterns that indicate possible fraud.
- **result**:
     - Identify and block fraudulent transactions promptly, reducing financial losses.
     - Improved the overall security and reliability of the system.

## **1.6 Advanced Mathematics Concepts**

### **Vector representation of high-dimensional space**

1. **Definition**:
     - Vector representation in high-dimensional space contains multiple dimensions beyond the three-dimensional space, and each dimension represents a characteristic or characteristic of the data.
2. **Expression**:
     - In mathematics, high-dimensional vectors are often represented as numeric arrays, such as **`[x1, x2, ..., xn]`**, where **`n`** is the number of dimensions.
3. **Geometric explanation**:
     - Although it is geometrically impossible to visualize space higher than three dimensions, high-dimensional vectors still follow the rules of vector operations in linear algebra.

### **Vector Operation**

1. **Dot product (inner product)**:
     - Used to measure the similarity of two vectors, calculated as **`A·B = Σ ai * bi`**, where **`ai`** and **`bi`** are the components of the vector.
2. **Cosine Similarity**:
     - Used to determine the angular similarity between vectors in high-dimensional space, the calculation formula is **`cos(θ) = (A·B) / (||A|| * ||B||)`**.
3. **Vector addition, subtraction and scalar multiplication**:
     - These basic operations operate component-by-component in high-dimensional space just as they do in two- or three-dimensional space.

### **Challenges in high-dimensional space**

1. **The Curse of Dimension**:
     - As the dimensionality increases, the data becomes increasingly sparse, which poses challenges to data analysis and machine learning model training.
2. **Limitations of intuitive understanding**:
     -In high-dimensional spaces, it becomes more difficult to intuitively understand data structures and patterns.
3. **Computational complexity**:
     - Operations and processing of high-dimensional vectors generally involve higher computational complexity.

### **Applications**

- **Feature space in machine learning**:
     - In machine learning, the input to a model is often represented as a high-dimensional feature vector to capture complex data characteristics.
- **Data Visualization in Data Science**:
     - Use dimensionality reduction techniques (such as PCA) to project high-dimensional data into a low-dimensional space for visualization.

## **1.7 Project Practice: Vector Database Application**

### **Project Concept: Personalized Recommendation System**

- **Goal**: Build a simple personalized recommendation system that uses a vector database to store and query feature vectors of users and items (such as movies, books).

### **Step 1: Data preparation and feature extraction**

1. **Select data source**:
     - Use public datasets, such as movie ratings or product review datasets.
2. **Feature extraction**:
     - Convert user behavior and preferences into feature vectors.
     - For items (such as movies or products), extract key features and generate vector representations.

### **Step 2: Vector database construction**

1. **Select vector database**:
     - Choose a suitable vector database platform, such as Milvus, Faiss or Elasticsearch's vector search plug-in.
2. **Database Design**:
     - Design database architecture, including data storage, indexing and query processing mechanisms.

### **Step 3: Recommendation algorithm implementation**

1. **similarity calculation**:
     - Implement an algorithm that uses a vector database for fast similarity calculations, such as user-item matching based on cosine similarity.
2. **Recommendation logic**:
     - Based on the user's feature vector, retrieve the most similar items from the database for recommendation.

### **Step 4: System Integration and Testing**

1. **Integration**:
     - Integrate the recommendation system into a simple application or web page.
2. **Test**:
     - Test the system to ensure the accuracy of recommendations and the responsiveness of the system.

### **Step Five: Evaluate and Optimize**

1. **Performance Evaluation**:
     - Evaluate the recommendation quality and query efficiency of the system.
2. **Optimization**:- Optimize based on test results, such as adjusting feature extraction methods or improving query algorithms.

---

## **1.8 Review and Evaluation**

### **Review what you learned**

1. **Vector Database Basics**:
     - Understand the definition, function and difference between vector database and traditional database.
     - Explores methods of storing and indexing vector data.
2. **Advanced Features and Algorithms**:
     - Learned advanced features used in vector databases, such as high-dimensional data processing and approximate nearest neighbor (ANN) search algorithms.
3. **Machine Learning Integration**:
     - Learned how to integrate machine learning models into vector databases and the benefits of doing so.
4. **Application Cases**:
     - Explored the application of vector databases in different fields such as recommendation systems and image recognition.
5. **Mathematical concepts**:
     - In-depth understanding of mathematical concepts of vector representation and operations in high-dimensional spaces.

### **Evaluation method**

1. **Comprehension Questions**:
     - Answer questions about vector databases and related concepts to test understanding.
2. **Practical application cases**:
     - Analyze a hypothetical or real case to explain how a vector database can be used to solve a specific problem.
3. **Critical Thinking**:
     - Discuss the suitability of vector databases in specific scenarios and their potential limitations.
4. **Self-Assessment**:
     - Reflect on your experience during the learning process, assessing your mastery of the concepts and any areas that require further study.

### **Suggested Assessment Questions**

1. Explain what are the main differences in data processing between vector databases and traditional databases?
2. Describe the role of approximate nearest neighbor search in vector databases.
3. Discuss the potential benefits of integrating machine learning models into vector databases.
4. Give examples to illustrate how vector databases are used in practical applications.

## Vector index (****Vector Index****)

**Article reference:**

[What is a Vector Index? An Introduction to Vector Indexing](https://www.datastax.com/guides/what-is-a-vector-index)

Vector index is a data structure used in computer science and information retrieval to efficiently store and retrieve high-dimensional vector data, enabling fast similarity searches and nearest neighbor queries.

The use of generative AI and large language models (LLMs) is growing at a very fast rate. Generative AI models are capable of creating realistic and interactive text, images, video and audio for a variety of problems. Companies are finding many uses for these types of AI algorithms, including building virtual assistants, new ways to search data, and tools to make people work more efficiently.

Generative AI models can be tailored to specific use cases by providing them with additional context and long-term memory. A common pattern for providing this additional context is called Retrieval Augmentation Generation (RAG).

For many use cases, RAG is implemented by creating a set of vector embeddings that encode semantic information that generates a dataset that will be used by AI applications, and then searching and retrieving relevant objects from that vector embedding dataset to provide Back to generate AI model.

Vector indexing is a key part of implementing RAG in generative AI applications. A vector index is a data structure that enables fast and accurate search and retrieval of vector embeddings from large object datasets. Datastax Astra DB (built on Apache Cassandra) is a vector database that provides vector indexing for fast object retrieval and efficient storage and data management for vector embedding.

In this guide, we will discuss vector indexing, how it works, its importance for generative AI applications through RAG, and how Datastax and Astra DB can help you implement vector indexing for generative AI products easily and efficiently.

****Understanding Vector Indexes****

The purpose of vector indexing is to search and retrieve data from a large collection of vectors. Why is this important for generative AI applications? Vector representations of data bring context to generative AI models.

Vector indexing allows us to easily find the specific data we are looking for among a large number of vector representations.

An embedding is a mathematical representation of data that captures the meaning of an object. Embeddings are created by taking an object and converting it into a list of numbers or a vector representation.

The resulting embeddings then place relevant content near other similar content in vector space.

****How vector indexing works****

In traditional databases and indexes, we store data as rows that represent some fact or concept, and a set of columns that describe that concept in more detail or link us to supporting tables that contain more information.

These data are scalar, which means they have only one value, rather than vector data containing multiple values.

When we query a scalar index to retrieve rows or records, we typically query for an exact match. The power of indexes that use vector embeddings to capture semantic information is that we can search for approximate matches in the index.

We provide a vector as input and ask the vector index to return other vectors similar to the input or query vector. This allows us to search large vector datasets very quickly.

The class of algorithms used to build and search vector indexes is called approximate nearest neighbor (ANN) search.

The ANN algorithm relies on similarity measures to determine nearest neighbors. Vector indexes must be constructed based on a specific similarity measure. To build the vector index, we choose a similarity measure and a method of creating the index.

****Local Sensitive Hash (LSH) Index****

Locality-sensitive hashing is an indexing strategy that optimizes for speed and finding approximate nearest neighbors, rather than performing an exhaustive search to find actual nearest neighbors like flat indexing.

The index is built using a hash function. Vector embeddings that are close to each other are hashed into the same bucket. We can then store all these similar vectors in a table or bucket.

When a query vector is provided, its nearest neighbors can be found by hashing the query vector and then computing a similarity measure for all vectors in the table against all other vectors that hash to the same value.

This results in smaller searches compared to flat indexes, where the similarity measure is calculated over the entire space, greatly increasing the speed of queries.

****Inverted File (IVF) Index****

Inverted file (IVF) indexing is similar to LSH in that the goal is to first map the query vector to a smaller subset of the vector space and then search only that smaller space to obtain approximate nearest neighbors. This will greatly reduce the number of vectors we need to compare to the query vector, thus speeding up our ANN search.

In LSH, subsets of vectors are produced by hash functions. In IVF, the vector space is first partitioned or clustered, and then the centroid of each cluster is found. For a given query vector, we find the nearest centroid.