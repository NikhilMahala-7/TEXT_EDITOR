import { Style } from "./Axs.js";


class DocNode 
{
    constructor(ChildArr = [] ,CaretPos = 0 , id ){
        this.Childs = ChildArr ; 
        this.CaretPos = CaretPos ;
        this.Doc_id = id ;
        this.level = -1 ; 
        this.From_abs = 0 ; 
        this._id = id ; 
        this._current_level = undefined ; 
    }

    EvalProps()
    {
        var Size = FindSize(this.Childs)
        return {size :Size , End_abs : (Size) ? (Size - 1) : 0 , From_abs : 0 } ; 
    }


    forEach(f)  
    {
        this.Childs.forEach(f) ; 
    }


    FindNodeAtPos_Deep(pos)
    {
        if(this.Childs.length === 0) return this ; 
        return Find_Node_Deep(this.Childs,pos);
    }
    
    TextBetween(from , to )
    {
        if(to === -1){to = this.EvalProps().End_abs}
        var nodes = this.NodeBetween_Included(from , to); 
        if(nodes.length === 0) return ""
        var text = "";
        nodes.forEach((node) => 
        {
            if(node._type === 0)
            {
                var offset_from = from - node.EvalProps().From_abs ;
                var offset_end = to - node.EvalProps().From_abs ; 
                if(offset_from < 0) {offset_from = 0 } 
                text += node.content.slice(offset_from , offset_end + 1);
            }
            else
            {
                text += node.TextBetween(from , to )
            }
        })

        return text ; 
    }

    NodeBetween_Included(from , to)
    {
        let finalArr = [] ; 
        if(this.Childs.length === 0) return [] 
        if(to > this.EvalProps().End_abs){to = this.EvalProps().End_abs}
        for(let i = 0 , pos = this.Childs[0].EvalProps().From_abs ; pos <= to ; i++)
        {
            if (i === this.Childs.length) break ;
            let child = this.Childs[i] ; let end = pos + child.EvalProps().size ; 
            if(end >= from)
            {
                finalArr.push(child);
            }
            pos = end ; 
        }

        return finalArr ; 
    }

    resetPos ()
    {
        this.forEach((node,index) => 
        {
            node.parent = this._id ; 
            node.count = index ;
            if(index === 0)
            {   
                node.From_abs = this.From_abs;
                node.resetPos() ; 
            } 
            else
            {
                node.From_abs = this.Childs[index - 1].EvalProps().End_abs + 1 ; 
                node.resetPos() ; 
            } 
        })
    }




    Search_By_Id(_id)
    {
        this.resetPos() ; // i think we can hold this up for a bit 
        if(_id === this._id)
        {
            return this ; 
        }
        var b = [] ;  _id.split("_").forEach((value,index) => {if(index){b.push({value : value.slice(2) , tag : value.slice(0,2)})}})
        if(!b.length ) return null ; 
        if( !this.Childs[b[0].value]) return null ; 
        return this.Childs[b[0].value].Find(0,b)
    }



    InsertCut(object)
    {
        this.Childs.splice(object.index , 0 ,object.Node);
        return {insertedAt : object.index , insertedInto : this}
    }

    printTree()
    {
        let {size , From_abs , End_abs} = this.EvalProps() ; 
        console.log("The Document with id : " , this._id , `    *    size : ${size} , startPos : ${From_abs}  , EndPos : ${End_abs}`)
        this.forEach((node) => 
        {
            let {size , From_abs , End_abs} = node.EvalProps() ; 
            console.log("\tThe Block Node with id : ",node._id,`:::::::::: size : ${size} , start Pos : ${From_abs} , end Pos : ${End_abs}`)
            node.printTree(2)
        })
    }


    // insert new Inline or Insert new Text 
    //This is Bold Text*This is UnderLine Text
    // now * is point where you wanna ask it so how will you do it ? huh ? either keep track of things in which you wanna move in
    // think of going back if you at a position x then check for the block with pos x - 1 , for edge cases we will talk 
    // Now as soon as the whole text content of the InlineNode becomes 0 , do not terminate the it , but we will google docs does not but we will 
    //Block Node with Length = 0 , does not Exist , remove it 
    // paragrph node can be empty due to following reasons as we need it for the spacing 
    // the caret will carry the styles so that even when we move to a new paragraph we do not face issuse like style change and other things 
    // so the caret will keep track of the styles applied to it and the node styles it has and can exist on the end of the paragraph but it will manage things 




    // we will talk about the insertion in another thing , let's make some commands first 
    // and yes the logic of the inserting the prev one will still work and is good as we will copy the block 
    // we will initalize the blocks as per the need 
    // and auto deletion of the block as needed , when the text content reaches 0 

    intialize()
    {
        if(this.Childs.length === 0)
        {
            var newTextNode = new TextNode("x",0 ,"Type Something");
            var newBlockNode = new BlockNode(this._id , "PH", 0 , [newTextNode] ,0)
            this.Childs.push(newBlockNode);
        }
    }


    parseDocument()
    {
        var string = "";
        this.forEach((node) => 
        {
            string += node.parseNode()
        }
        )

        return string ; 
    }



    IsSuitable(type , styles , Node)
    {
        if(Node.typ === type)
        {
            return false ;  
        }

        return Node.styles.IsSuitable(styles)
    }


    InsertInlineNode(type , styles , pos) // for multiple types , we will think about it 
    {
        var NodeRear = this.FindNodeAtPos_Deep(pos - 1);
        var NodeCurrent = this.FindNodeAtPos_Deep(pos);



        // cases @Current (Node Current Exist but not the Node Rear)
        // cases Bold@UnderLine (Node Current Exist and Node Rear but not equal)
        // cases Bold@ (Node Current Does not exist but Node Rear Exist)
        if((NodeRear && NodeCurrent) && (NodeRear._id !== NodeCurrent._id)) // for case like this Bold@UnderLine
        {
            console.log("running for the case 1")
            var ParentLevel_Rear = NodeRear.level - 1; 
            var Obj = NodeRear.ExtractRoots() ; 
            var SuitableParent = this.Search_By_Id(Obj["0"]) ; 
            for(let i = ParentLevel_Rear ; i > 0 ; i--)
            {
                var parent = this.Search_By_Id(Obj[`${i}`]);
                var bool = this.IsSuitable(type , styles , parent);
                if(bool)
                {
                    SuitableParent = parent ;
                    break  
                }
            }
            var indexo = SuitableParent.NodeBetween_Included(pos - 1,pos)[0].count
            var ET = new TextNode("a",0,"\u200B",pos)
            var Node = new InlineNode(SuitableParent._id , type , indexo + 1 , [ET] ,pos ,styles);
            SuitableParent.Childs.splice(indexo + 1 , 0 ,Node);
            this.resetPos()
            return ; 
        }


        if(!NodeCurrent && NodeRear)
        {
            console.log("running for the case 2")
            var ParentLevel_Rear = NodeRear.level - 1; 
            var Obj = NodeRear.ExtractRoots() ; 
            var SuitableParent = this.Search_By_Id(Obj["0"]) ; 
            for(let i = ParentLevel_Rear ; i > 0 ; i--)
            {
                var parent = this.Search_By_Id(Obj[`${i}`]);
                var bool = this.IsSuitable(type , styles , parent);
                if(bool)
                {
                    SuitableParent = parent ;
                    break  
                }
            }
            var indexo = SuitableParent.NodeBetween_Included(pos - 1,pos)[0].count
            var ET = new TextNode("a",0,"\u200B",pos)
            var Node = new InlineNode(SuitableParent._id , type , indexo + 1 , [ET] ,pos ,styles);
            SuitableParent.Childs.splice(indexo + 1 , 0 ,Node);
            this.resetPos()
            return ;   
        }


        if(NodeCurrent && NodeRear && (NodeRear._id === NodeCurrent._id))
        {
            console.log("running for the case 3")
            var ParentLevel_Rear = NodeRear.level - 1; 
            var SuitableLevel  = 0 ; 
            var Obj = NodeRear.ExtractRoots() ; 
            var SuitableParent = this.Search_By_Id(Obj["0"]) ; 
            for(let i = ParentLevel_Rear ; i > 0 ; i--)
            {
                var parent = this.Search_By_Id(Obj[`${i}`]);
                var bool = this.IsSuitable(type , styles , parent);
                if(bool)
                {
                    SuitableLevel = i ; SuitableParent = parent ;
                    break  
                }
            }
            // Cut open the layer suitablelayer + 1 
            var indexo = null ; 
            for(let i = NodeRear.level ; i > SuitableLevel ;i--)
            {
                var CuttingNode = this.Search_By_Id(Obj[`${i}`]);
                var Peice = CuttingNode.Cut_Pos(pos)
                this.Search_By_Id(Obj[`${i - 1}`]).InsertCut(Peice)
                if(i === SuitableLevel + 1)
                {
                    indexo = CuttingNode.count + 1;
                }
            }
            var ET = new TextNode("a",0,"\u200B",pos)
            var Node = new InlineNode(SuitableParent._id , type , indexo  , [ET] ,pos ,styles);
            SuitableParent.Childs.splice(indexo , 0 ,Node);
            return ;
        }

        // One case is left and that is @Bold , nodeRear does not exist , only valid for the first paragraph 
        // we will look for this part in the future 
    }
}






class BlockNode  // can contain textNode and inlineNode
{
    constructor(
       parentId,
       type , // h1 to h6 , pr 
       count  ,
       childArr ,
       From_abs  , 
    )


    {
        this.count = count ;
        this.parent = parentId ;
        this.typ = type ;   
        this._id = this.parent + "_" + this.typ +  this.count ; 
        this.Childs = childArr ; 
        this.From_abs = From_abs; 
        this.level = 0 ; // fixed , Cannot change 
        this._type = 2 ; // fixed , Cannot change
        this.Element = this.EvalElement() ; 
    }

    EvalElement()
    {
        switch (this.typ)
        {
            case "PH":
            return "p"

            case "H1":
            return "h1"

            case "H2":
            return "h2"

            case "H3":
            return "h3"

            case "H4":
            return "h4"

            case "H5":
            return "h5"

            case "H6":
            return "h6"

            default :
            return "p"
        }
    }


    EvalProps()
    {
        var Size = FindSize(this.Childs)
        return {size :Size , End_abs : (Size) ? (this.From_abs + Size - 1) : this.From_abs ,From_abs : this.From_abs } ; 
    }

    forEach(f)  
    {
        this.Childs.forEach(f) ; 
    }


    TextBetween(from , to )
    {
        console.log("calling for the block node" , this._id)
        var nodes = this.NodeBetween_Included(from , to);
        if(nodes.length === 0) return ""
        var text = "";
        nodes.forEach((node , index ) => 
        {
            if(node._type === 0)
            {
                var offset_from = from - node.EvalProps().From_abs ;
                var offset_end = to - node.EvalProps().From_abs ; 
                if(offset_from < 0) {offset_from = 0 } 
                text += node.content.slice(offset_from , offset_end + 1);
            }
            else
            {
                text += node.TextBetween(from , to )
            }
        })
        return text ; 
    }

    NodeBetween_Included(from , to )
    {
        let finalArr = [] ;
        if(this.Childs.length === 0) return []  
        if(to > this.EvalProps().End_abs){to = this.EvalProps().End_abs}
        for(let i = 0 , pos = this.Childs[0].EvalProps().From_abs ; pos <= to ; i++)
        {
            if (i === this.Childs.length) break ;
            let child = this.Childs[i] ; let end = pos + child.EvalProps().size ; 
            if(end > from)
            {
                finalArr.push(child);
            }
            pos = end ; 
        }

        return finalArr ; 
    }



    resetPos ()
    {

        this._id = this.parent + "_" + this.typ +  this.count ; 
        this.Childs.forEach((node,index) => 
        {
            node.parent = this._id ; 
            node.count = index ;
            if(index === 0)
            {   
                node.From_abs = this.From_abs;
                node.resetPos() ; 
            } 
            else
            {
                node.From_abs = this.Childs[index - 1].EvalProps().End_abs + 1 ; 
                node.resetPos() ; 
            }
        })
    }





    Find(index , array)
    {
        if(index < array.length - 1 && index >= 0)
        {
            return this.Childs[array[index + 1].value].Find(index + 1 , array )
        }

        if(index === array.length - 1 && index >= 0 && Number(array[index].value) === this.count && array[index].tag === this.typ)
        {
            return this ; 
        }
    }




    /**@internal */
    I_I_I_N(index = this.Childs.length ,type , arr = [] )
    {
        if(index === -1){index = this.Childs.length}
        var node = new InlineNode(this._id , type , index , arr , 0)
        this.Childs.splice(index , 0 , node);
    }


    /**@internal */
    I_T_I_N(index = this.Childs.length ,content )
    {
        if(index === -1){index = this.Childs.length}
        var node = new TextNode(this._id , index , content , 0 )
        this.Childs.splice(index , 0 , node);
        this.resetPos() ; 
    }

    InsertCut(object)
    {
        this.Childs.splice(object.index , 0 ,object.Node);
        return {insertedAt : object.index , insertedInto : this}
    }

    Cut_Pos(pos)
    {
        var ExcludedNodes = this.NodeBetween_Included(pos , -1)
        var includedNodes = [];
        for(let i = 0 ; i < this.Childs.length ; i++)
        {
            if(this.Childs[i] === ExcludedNodes[0]){break}
            includedNodes.push(this.Childs[i])
        }
        this.Childs = includedNodes ;
        return {Node : new InlineNode(this.parent ,this.typ , this.count + 1, ExcludedNodes , pos ) , index : this.count + 1}
    }


    printTree(val)
    {
        var string = "\t".repeat(val);
        this.forEach((node) => 
        {
            let {size , From_abs , End_abs} = node.EvalProps() ; 
            console.log(string , `The ${node.typ} Node with Id ${node._id} ::: {size : ${size} , StartPos : ${From_abs} , EndPos : ${End_abs} } `)
            node.printTree(val + 1)
            console.log("\n")
        })
    }

    parseNode()
    {
        var string = "";
        this.forEach((node) => 
        {
            string += node.parseNode()
        })

        return `<${this.Element}>${string}</${this.Element}>`
    }


}











class InlineNode // can contain textNode and inlineNode 
{
    constructor(
        parentId ,
        type  , // SP for span , EM , UL , ST , // LN for link  we will think about the link later 
        count ,
        childArr ,
        From_abs = 0  , 
        styles = {},
    )
    
    {
        this.parent = parentId ; 
        this.count = count ; 
        this.typ = type ; 
        this._id = this.parent + "_" + this.typ + this.count ; // count also includes the ownContent 
        this.Childs = childArr ; // made up of textNode and InlineNode , in order 
        this.From_abs = From_abs ;
        this.level = ((this._id.split("_")).length - 2)
        this._type = 1 ;
        this.styles = new Style(styles) ;  
        this.Element = this.EvalElement();
    }

    EvalElement()
    {
        switch (this.typ)
        {
            case "SP" :
            return "span"

            case "EM" :
            return "em"

            case "ST":
            return "strong"

            default :
            return "span"
        }
    }
    EvalProps()
    {
        var Size = FindSize(this.Childs)
        return {size :Size , End_abs : (Size) ? (this.From_abs + Size - 1) : this.From_abs ,From_abs : this.From_abs } ; 
    }

    forEach(f)  
    {
        this.Childs.forEach(f) ; 
    }


    TextBetween(from , to )
    {
        var nodes = this.NodeBetween_Included(from , to); 
        if(nodes.length === 0) return ""
        var text = "";
        nodes.forEach((node) => 
        {
            if(node._type === 0)
            {
                var offset_from = from - node.EvalProps().From_abs ;
                var offset_end = to - node.EvalProps().From_abs ;  
                if(offset_from < 0) {offset_from = 0 }
                text += node.content.slice(offset_from , offset_end + 1);
            }
            else
            {
                text += node.TextBetween(from , to )
            }
        })


        return text ; 
    }



    resetPos ()
    {
        this._id = this.parent + "_" + this.typ + this.count ; // count also includes the ownContent 
        this.level = ((this._id.split("_")).length - 2)
        if(!this.Childs){return}
        this.Childs.forEach((node,index) => 
        {
            node.count = index ; 
            node.parent = this._id ;
            if(index === 0)
            {
                node.From_abs = this.From_abs;
                node.resetPos() ; 
            } 
            else
            {
                node.From_abs = this.Childs[index - 1].EvalProps().End_abs + 1 ; 
                node.resetPos() ; 
            }

            if(node._type)
            {
                node.styles.updateStyles(this.styles.CompleteStyle)
            }
        })
    }


    NodeBetween_Included(from , to )
    {
        let finalArr = [] ; 
        if(this.Childs.length === 0) return [] 
        if(to > this.EvalProps().End_abs || to === -1){to = this.EvalProps().End_abs}
        for(let i = 0 , pos = this.Childs[0].EvalProps().From_abs ; pos <= to ; i++)
        {
            if (i === this.Childs.length) break ;
            let child = this.Childs[i] ; let end = pos + child.EvalProps().size ; 
            if(end > from)
            {
                finalArr.push(child);
            }
            pos = end ; 
        }

        return finalArr ; 
    }




    Find(index , array)
    {
        if(index < array.length - 1 && index >= 0)
        {
            return this.Childs[array[index + 1].value].Find(index + 1 , array )
        }

        if(index === array.length - 1 && index >= 0 && Number(array[index].value) === this.count && array[index].tag === this.typ)
        {
            return this ; 
        }
    }




    /**@internal */
    I_I_I_N(index = this.Childs.length ,type ,arr = [])
    {
        if(index === -1){index = this.Childs.length}
        var node = new InlineNode(this._id , type , index ,  arr , 0)
        this.Childs.splice(index , 0 , node);
    }




    /**@internal */ // insert Text Indexed New
    I_T_I_N(index = this.Childs.length ,content )
    {
        if(index === -1){index = this.Childs.length}
        var node = new TextNode(this._id , index , content , 0 )
        this.Childs.splice(index , 0 , node);
    }



    InsertCut(object)
    {
        this.Childs.splice(object.index  , 0 ,object.Node);
    }

    Cut_Pos(pos)
    {
        var ExcludedNodes = this.NodeBetween_Included(pos , -1)
        var includedNodes = [];
        for(let i = 0 ; i < this.Childs.length ; i++)
        {
            if(this.Childs[i] === ExcludedNodes[0]){break}
            includedNodes.push(this.Childs[i])
        }
        this.Childs = includedNodes ;
        return {Node : new InlineNode(this.parent ,this.typ , this.count + 1, ExcludedNodes , pos , this.styles ) , index : this.count + 1}
    }

    printTree(val)
    {
        var string = "\t".repeat(val);
        this.forEach((node) => 
        {
            var {size , From_abs , End_abs} = node.EvalProps() ; 
            console.log(string , `The ${node.typ} Node with Id ${node._id} ::: {size : ${size} , StartPos : ${From_abs} , EndPos : ${End_abs}} `)
            node.printTree(val + 1)
        })
    }

    parseNode()
    {
        var string = "";
        this.forEach((node) => 
        {
            string += node.parseNode()
        })
        var sty = this.styles.Styles ; 
        if(sty !== "")
        {
            return `<${this.Element} style="${sty}">${string}</${this.Element}>`
        }
        return `<${this.Element} >${string}</${this.Element}>`
    }


}









class TextNode // cannot contain anything  , all the content is basically the textNode what you see 
{
    constructor(
        parentId  , 
        count , 
        content ="\u200B", 
        From_abs = 0  ,  
    )

    {
        this.parent = parentId ; 
        this.count = count ; 
        this.typ = "TX"
        this._id = this.parent + "_" + this.typ + this.count ; 
        this.content = content || "\u200B" ; // will be string  
        this.From_abs = From_abs 
        this.level = ((this._id.split("_")).length - 2)
        this._size = this.content.length ; 
        this.End_abs = this.From_abs + this._size - 1 ; 
        this._type = 0 ; 
    }

    EvalProps()
    {
        return {size : this._size , End_abs : (this._size) ? (this.From_abs + this._size - 1) : this.From_abs , From_abs : this.From_abs } ; 
    }


    resetPos ()
    {
        this._id = this.parent + "_" + this.typ + this.count ; 
        this.level = ((this._id.split("_")).length - 2) ;
        this.End_abs = (this._size) ? (this.From_abs + this._size - 1) : this.From_abs ; 
    }




    Find(index , array)
    {
        if(index < array.length - 1 && index >= 0)
        {
            return undefined
        }

        if(index === array.length - 1 && index >= 0 && Number(array[index].value) === this.count , array[index].tag === this.typ)
        {
            return this ; 
        }
    }

    printTree(){/* reached the end */}


    parseNode()
    {
        return this.content
    }

    ExtractRoots()
    {
        const nodeId = this._id.split("_");
        const Obj = {} ; 
        var initLevel = -1 ; 
        nodeId.forEach((val , index) => 
        {
            if(index)
            {
                Obj[`${initLevel}`] = Obj[`${initLevel - 1}`] + "_" + val ; 
            }else
            {
                Obj[`${initLevel}`] = val ; 
            }
            initLevel++ ; 
        }
        )
        return Obj ;
    }

    Cut_Pos(pos)
    {
        var offset = pos - this.From_abs ;
        var RetainedContent = (offset) ? this.content.slice(0,offset) : "\u200B";
        var CuttedContent = this.content.slice(offset);
        this.content = RetainedContent;
        this._size = this.content.length ;
        this.End_abs = (this._size) ? (this.From_abs + this._size - 1) : this.From_abs ; 

        return {Node : new TextNode(this.parent ,this.count + 1 ,CuttedContent,this.End_abs + 1) , index : this.count + 1} 
    }
}




const FindSize = (arr) => {
    let total = 0;
    const stack = [...arr];

    while (stack.length) {
        const node = stack.pop(); // will give last elem and removes it 

        if (node._type === 0) {
            total += node._size || 0;
        } else if (Array.isArray(node)) {
            stack.push(...node);
        } else if (node && typeof node === 'object' && node.Childs) {
            stack.push(...node.Childs);
        }
    }
    return total;
};



const Find_Node_Deep = (arr , pos) => // for node at deepest level 
{   
    for(let i = 0 ; i < arr.length ; i++)
    {
        var elem = arr[i] ; 
        if(elem.EvalProps().End_abs >= pos )
        {
            if(elem._type === 0 || elem.Childs.length === 0)
            {
                return elem ; 
            }
            return Find_Node_Deep(elem.Childs , pos) ;  
        }
    }
}


export {DocNode , InlineNode , BlockNode , TextNode} ; 
