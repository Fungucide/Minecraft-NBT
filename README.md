# Minecraft-NBT
 
A TypeScript implementation of Minecraft's NBT data system. This was written as part of a project to modify building templates generated from the Building Gadgets Minecraft mod.

## Structure

Each type of tag has it's own class that is responsible for the implementation of specific actions such as writing and reading data to and from the data stream. By having each class implement the `AbstractNBT` class, programatically converting the data to and from stream form is trivialize.
