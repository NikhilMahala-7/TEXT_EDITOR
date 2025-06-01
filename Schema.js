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
        if(to > this.EvalProps().End_abs || to === -1){to = this.EvalProps().End_abs}
        if(from > this.EvalProps().End_abs){return []}
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

    // Doc Node -> BlockNode's Reset -> ResetFxn 
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

    ExtractStyleMap(pos)
    {
        const Node = this.FindNodeAtPos_Deep(pos);
        if(Node._type) {throw new Error("It is not Text Node")}
        const Obj = Node.ExtractRoots() ; 
        const Level = Node.level ; 
        var Ts = new TextNode("TX",0,"\u200B",0)
        var NodesArr = [Ts]
        for(let i = Level - 1 , j = 1 ; i > 0 ; i-- , j++)
        {
            NodesArr.push(this.Search_By_Id(Obj[`${i}`]).copyNode_shallow([NodesArr[j - 1]]))
        }

        
        return NodesArr[NodesArr.length - 1]
    }


    ExtractStyles(pos)
    {
        var Node = this.FindNodeAtPos_Deep(pos);
        var NodeLevel = Node.level ; 
        var Styles = {
            "BlockasParent" : false ,
            "CompleteStyles" : {},
            "IncludedTypes" : [] 
        }
        if(NodeLevel > 1)
        {
            var ParentNode = this.Search_By_Id(Node.ExtractRoots()[`${NodeLevel - 1}`])
            Styles["CompleteStyles"] = ParentNode.styles.CompleteStyle ;
            Styles["IncludedTypes"] = ParentNode.IncludeTypes ; 
            return Styles 
        }
        if(NodeLevel === 1)
        {
            Styles["BlockasParent"] = true
            return Styles
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


    IsCorrectLayer(Array , Node , styles)
    {
        var NodeArray = Node.IncludeTypes;
        var _ArrhasSpan = Array.includes("SP");
        if(_ArrhasSpan)
        {
            Array.splice(Array.indexOf("SP"),1);
            Array.push("SP");
        }

        if(NodeArray.length > Array.length)
        {
            return {bool : false , arr : Array , _hasSpan : _ArrhasSpan , _hasHope : true  , _styles : styles }
        }


        if(NodeArray.includes("SP"))
        {
            var boolObj = Node.styles.IsSuitable(styles);
            var newStylesS = styles ;  
            var includeSpan = true ; 
            if(boolObj._bool)
            {
                    newStylesS = boolObj.newStyles ;
                    includeSpan = Object.keys(newStylesS).length
                    var NewArray = [] ; // span will be not be pushed  based on conditions
                    for(let i = 0 ; i < Array.length ; i++)
                    {
                        if(!NodeArray.includes(Array[i])){NewArray.push(Array[i])}
                    }
                    var isFalse = false ; 
                    for(let i = 0 ; i < NodeArray.length ; i++){if(!Array.includes(NodeArray[i])){isFalse = true}}
                    if(NewArray.length === Array.length || isFalse)
                    {return {bool : false , arr : Array , _hasSpan : _ArrhasSpan , _hasHope : true ,_styles : styles  }}
                    if(includeSpan)
                    {
                        NewArray.push("SP")
                    }
                    return {bool : true , arr : NewArray , _hasSpan : includeSpan , _hasHope : true , _styles : newStylesS }
            }
            else
            {
                return {bool : false , arr : Array , _hasSpan : _ArrhasSpan , _hasHope : true , _styles : styles}
            }
        }else
        {
        
            var NewArray = [] ; // span will be pushed based on conditions
            for(let i = 0 ; i < Array.length ; i++)
            {
                if(!NodeArray.includes(Array[i])){NewArray.push(Array[i])}
            }
            var isFalse = false ; 
            for(let i = 0 ; i < NodeArray.length ; i++){if(!Array.includes(NodeArray[i])){isFalse = true}}
            if(NewArray.length === Array.length || isFalse)
            {return {bool : false , arr : Array , _hasSpan : _ArrhasSpan , _hasHope : true ,_styles : styles  }}

            return {bool : true , arr : NewArray , _hasSpan : _ArrhasSpan , _hasHope : true , _styles : styles }
        
        } 

    }




    ExtendTextNode(pos , content)
    {
        var TextNode = this.FindNodeAtPos_Deep(pos - 1);
        var _hasU = false ;
        if(TextNode.content.includes("\u200B")){
            _hasU = true ; 
            var Parent = this.Search_By_Id(TextNode.ExtractRoots()["0"])//
            if(TextNode.EvalProps().From_abs === Parent.EvalProps().From_abs)
            {
                _hasU = false ; 
            }
        } // we will have to find a way to preserve that 
        if(TextNode._type !== 0)
        {
            throw new Error("This does Not Matches")
        }
        TextNode.ExtendContent(pos , content , _hasU )
        return _hasU
    }


 
    SliceText(pos) // one time thing 
    {
        var TextNode = this.FindNodeAtPos_Deep(pos - 1);
        if(TextNode && TextNode._type !== 0)
        {
            throw new Error("The type does not Matches")
        }

        if(TextNode._size === 1) // we will see the mergin just in a bit 
        {
            var lvl = TextNode.level ; 
            var obj = TextNode.ExtractRoots();
            var PNode = this.Search_By_Id(obj["0"])
            var C1 = PNode.EvalProps().From_abs === pos - 1; 
            var Count = TextNode.count ; 
            for(let i = lvl - 1 ; i > -2 ; i--)
            {
                var Editable = this.Search_By_Id(obj[`${i}`]);
                Editable.Childs.splice(Count,1);
                if(Editable.Childs.length > 0) break 
                Count = Editable.count ; 
            }
            if(C1 && PNode.Childs.length && PNode.count > 0 )
            {
                this.Childs[PNode.count - 1].Childs = this.Childs[PNode.count - 1].Childs.concat(PNode.Childs);
                this.Childs.splice(PNode.count)
            }
            this.resetPos()
            return 
        }

        TextNode.sliceContent(pos)
    }

    Cast(type,pos)
    {
        var Nodes = this.NodeBetween_Included(pos - 1 , pos );
        if(pos < 1) {console.log("You are at very Beginning of the Doc so cast with precaution") ; return }
        if(Nodes.length > 1)
        {
            Nodes[1].typ = type ;
            Nodes[1].Element = Nodes[1].EvalElement() // cast the second one
            Nodes[1]._id = Nodes[1].parent + "_" + type +  Nodes[1].count ; 

        }
        if(Nodes.length === 1)
        {
            Nodes[0].typ = type ; 
            Nodes[0].Element = Nodes[0].EvalElement() 
            Nodes[0]._id = Nodes[0].parent + "_" + type +  Nodes[0].count ; 
        }

        this.resetPos()
    }


    InsertInlineNode_Layered(types ,style = {} ,  pos )
    {
        if(!types.length){throw new Error("You cannot insert Node without a type ")}
        var NodeRear = this.FindNodeAtPos_Deep(pos - 1);
        var NodeCurrent = this.FindNodeAtPos_Deep(pos);
        var hasSP = types.includes("SP");

        if((NodeRear && NodeCurrent) && (NodeRear._id !== NodeCurrent._id)) 
        {
            console.log("running for the case 1")
            var ParentLevel_Rear = NodeRear.level - 1; 
            var Obj = NodeRear.ExtractRoots() ; 
            var SuitableParent = this.Search_By_Id(Obj["0"]) ;
            var SuitableLevel  = 0 ; 
            var FormedArr = types ;  
            var FormedStyle = style;
            for(let i = ParentLevel_Rear ; i > 0 ; i--)
            {
                var parent = this.Search_By_Id(Obj[`${i}`]);
                var ulid = this.IsCorrectLayer(types  , parent , style);
                if(ulid.bool)
                {
                    SuitableLevel = i ; SuitableParent = parent ;
                    FormedArr = ulid.arr;
                    FormedStyle = ulid._styles;
                    hasSP = ulid._hasSpan
                    break  
                }
            }

            var ET = new TextNode("a",0,"\u200B",pos)  ;
            var indexo = SuitableParent.NodeBetween_Included(pos - 1,pos)[0].count
            var lastInseredNode = ET ;
            var endIdx = FormedArr.length 
            var NodesArr = [] ; 
            if(hasSP)
            {
                lastInseredNode = new InlineNode("a","SP",0,[ET],0,FormedStyle)
                endIdx = FormedArr.length - 1; 
            }
            for(let i = 0 ; i < endIdx ; i++)
            {
                if(i)
                {
                    NodesArr.push(new InlineNode(SuitableParent._id , FormedArr[i] , 1 , [NodesArr[i - 1]] ,pos , {}))
                    continue ;
                }
                NodesArr.push(new InlineNode(SuitableParent._id , types[i] , 1 , [lastInseredNode] ,pos ,{}))
            }
            var FinalNode = NodesArr[NodesArr.length - 1]
            SuitableParent.Childs.splice(indexo + 1 , 0 ,FinalNode);
            this.resetPos()
            return ; 
        }


        if(!NodeCurrent && NodeRear) 
        {
            console.log("running for the case 2")
            var ParentLevel_Rear = NodeRear.level - 1; 
            var Obj = NodeRear.ExtractRoots() ; 
            var SuitableParent = this.Search_By_Id(Obj["0"]) ;
            var FormedArr = types ;  
            var FormedStyle = style;
            for(let i = ParentLevel_Rear ; i > 0 ; i--)
            {
                var parent = this.Search_By_Id(Obj[`${i}`]);
                var ulid = this.IsCorrectLayer(types  , parent , style);
                if(ulid.bool)
                {
                    SuitableLevel = i ; SuitableParent = parent ;
                    FormedArr = ulid.arr;
                    FormedStyle = ulid._styles;
                    hasSP = ulid._hasSpan
                    break  
                }
            }
            var indexo = SuitableParent.NodeBetween_Included(pos - 1,pos)[0].count
            var ET = new TextNode("a",0,"\u200B",pos)  ;
            var lastInseredNode = ET ;
            var endIdx = FormedArr.length 
            var NodesArr = [] ; 
            if(hasSP)
            {
                lastInseredNode = new InlineNode("a","SP",0,[ET],0,FormedStyle)
                endIdx = FormedArr.length - 1; 
            }
            for(let i = 0 ; i < endIdx ; i++)
            {
                if(i)
                {
                    NodesArr.push(new InlineNode(SuitableParent._id , FormedArr[i] , 1 , [NodesArr[i - 1]] ,pos , {}))
                    continue ;
                }
                NodesArr.push(new InlineNode(SuitableParent._id , FormedArr[i] , 1 , [lastInseredNode] ,pos ,{}))
            }
            var FinalNode = NodesArr[NodesArr.length - 1] || lastInseredNode ; 
            SuitableParent.Childs.splice(indexo + 1 , 0 ,FinalNode);
            this.resetPos()
            return ; 
        }


        if(NodeCurrent && NodeRear && (NodeRear._id === NodeCurrent._id))
        {
            console.log("running for the case 3")
            var ParentLevel_Rear = NodeRear.level - 1; 
            var Obj = NodeRear.ExtractRoots() ; 
            var SuitableParent = this.Search_By_Id(Obj["0"]) ;
            var SuitableLevel = 0 ;  
            var FormedArr = types ;  
            var FormedStyle = style;
            for(let i = ParentLevel_Rear ; i > 0 ; i--)
            {
                var parent = this.Search_By_Id(Obj[`${i}`]);
                var ulid = this.IsCorrectLayer(types  , parent , style);
                if(ulid.bool)
                {
                    SuitableLevel = i ; SuitableParent = parent ;
                    FormedArr = ulid.arr;
                    FormedStyle = ulid._styles;
                    hasSP = ulid._hasSpan
                    break  
                }
            }

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


            var ET = new TextNode("a",0,"\u200B",pos)  ;
            var lastInseredNode = ET ;
            var endIdx = FormedArr.length 
            var NodesArr = [] ; 
            if(hasSP)
            {
                lastInseredNode = new InlineNode("a","SP",0,[ET],0,FormedStyle)
                endIdx = FormedArr.length - 1; 
            }
            for(let i = 0 ; i < endIdx ; i++)
            {
                if(i)
                {
                    NodesArr.push(new InlineNode(SuitableParent._id , FormedArr[i] , 1 , [NodesArr[i - 1]] ,pos , {}))
                    continue ;
                }
                NodesArr.push(new InlineNode(SuitableParent._id , types[i] , 1 , [lastInseredNode] ,pos ,{}))
            }
            var FinalNode = NodesArr[NodesArr.length - 1]
            SuitableParent.Childs.splice(indexo , 0 ,FinalNode);
            this.resetPos()
            return ; 
        }

    }




    insertBlockNode(type , pos) 
    {
        if(pos === 0){throw new Error("You cannot insert a block a position 0 , we have plans in future for this ")}
        var Nodes = this.NodeBetween_Included(pos - 1, pos);
        var NodeCount = Nodes.length ; 
        if(NodeCount)
        {
            var TS  = this.ExtractStyleMap(pos - 1) ; 
            var Node = new BlockNode(this._id , type , Nodes[0].count + 1 , [TS] ,pos);
            if(NodeCount > 1 || (NodeCount === 1 && Nodes[0].EvalProps().End_abs + 1 === pos)) // we are at breakPoint
            {
                this.Childs.splice(Nodes[0].count + 1 , 0 , Node); // directInsertion
            }

            if(NodeCount === 1 && Nodes[0].EvalProps().End_abs + 1 !== pos)
            {
                    var NodeRear = this.FindNodeAtPos_Deep(pos);
                    var Obj = NodeRear.ExtractRoots();
                    var indexo = 0 ; 
                    for(let i = NodeRear.level ; i > -1 ;i--)
                    {
                        var CuttingNode = this.Search_By_Id(Obj[`${i}`]);
                        var Peice = CuttingNode.Cut_Pos(pos)
                        this.Search_By_Id(Obj[`${i - 1}`]).InsertCut(Peice)
                        if(i === 0)
                        {
                            console.log("the cutting node is having id" , CuttingNode._id , CuttingNode.count + 1)
                            indexo = CuttingNode.count + 1;
                        }
                    }

                    this.Childs.splice(indexo , 0 , Node)
            }

            this.resetPos()
        }
        else
        {
            throw new Error("No nodes were found in this document")
        }
    }


    insertTextNode_1(pos , content)
    {
        var NodeBehind = this.FindNodeAtPos_Deep(pos - 1);
        var Level = NodeBehind.level ; 
        if(Level > 1)
        {
            var Obj = NodeBehind.ExtractRoots() ;  
            var TopNode = this.Search_By_Id(Obj["1"])
            var ParentNode = this.Search_By_Id(Obj["0"])
            var TN = new TextNode("TN",TopNode.count + 1 , content , pos)
            if(pos === TopNode.EvalProps().End_abs + 1)
            {
                ParentNode.Childs.splice(TopNode.count + 1, 0  ,TN)
                this.resetPos() ; 
                return 
            }

            for(let i = Level ; i > 0 ; i--)
            {
                var CuttingNode = this.Search_By_Id(Obj[`${i}`]);
                var Peice = CuttingNode.Cut_Pos(pos)
                this.Search_By_Id(Obj[`${i - 1}`]).InsertCut(Peice)
            }
            
            ParentNode.Childs.splice(TopNode.count + 1, 0  ,TN)
            this.resetPos()

        }
        if(Level === 1)
        {
            console.log("Extending the Node")
            this.ExtendTextNode(pos,content)   
        }
    }

}






class BlockNode  
{
    constructor(
       parentId,
       type ,  
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
        this.level = 0 ; 
        this._type = 2 ; 
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

            case "HR" :
            return "hr"

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
        if(to > this.EvalProps().End_abs || to === -1){to = this.EvalProps().End_abs}
        if(from > this.EvalProps().End_abs){return []}
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



    InsertCut(object)
    {
        this.Childs.splice(object.index , 0 ,object.Node);
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
        return {Node : new BlockNode(this.parent ,this.typ , this.count + 1, ExcludedNodes , pos ) , index : this.count + 1}
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

        return `<${this.Element} id="${this._id}">${string}</${this.Element}>`
    }


}











class InlineNode  
{
    constructor(
        parentId ,
        type  ,  
        count ,
        childArr ,
        From_abs = 0  , 
        styles = {}, // 
    )
    
    {
        this.parent = parentId ; 
        this.count = count ; 
        this.typ = type ; 
        this._id = this.parent + "_" + this.typ + this.count ;  
        this.Childs = childArr ;  
        this.From_abs = From_abs ;
        this.level = ((this._id.split("_")).length - 2)
        this._type = 1 ;
        this.stl = styles ;
        this.styles = new Style(styles) ;  
        this.Element = this.EvalElement();
        this.IncludeTypes = [this.typ];
        this.InheritedTypes = []
        this.updateInheritedStyles()
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

            case "UL":
            return "u"

            default :
            return "span"
        }
    }

    updateInheritedStyles()
    {
        var Arr = [];
        for (let i = 0 ; i < this.IncludeTypes.length ; i++)
        {
            if(this.IncludeTypes[i] !== this.typ) Arr.push(this.IncludeTypes[i])
        }
        this.InheritedTypes = Arr ; 
    }
    updateIncludedTypes(Array)
    {
        for(let i = 0 , j = Array.length - 1 ; i<=j ; i++ , j--)
        {

            if(!this.IncludeTypes.includes(Array[i]))
            {
                this.IncludeTypes.push(Array[i])
                if(i === j) break 
            }

            if(!this.IncludeTypes.includes(Array[j]))
            {
                this.IncludeTypes.push(Array[j])
            }
        }

        this.updateInheritedStyles()
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
        this._id = this.parent + "_" + this.typ + this.count ; 
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
                node.updateIncludedTypes(this.IncludeTypes)
            }
        })
    }


    NodeBetween_Included(from , to )
    {
        let finalArr = [] ; 
        if(this.Childs.length === 0) return [] 
        if(to > this.EvalProps().End_abs || to === -1){to = this.EvalProps().End_abs}
        if(from > this.EvalProps().End_abs){return []}
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
            return `<${this.Element} style=" ${sty}" id="${this._id}">${string}</${this.Element}>`
        }
        return `<${this.Element} id="${this._id}" >${string}</${this.Element}>`
    }


    copyNode_shallow(arr = [])
    {
        return  new InlineNode(this._id , this.typ , 0 ,arr ,0 ,this.styles.CompleteStyle)
    }
}




class TextNode  
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
        this.content = content || "\u200B" ;   
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

    printTree(){}


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

    ExtendContent(pos , content , condition)
    {
        
        var offSet = pos - this.From_abs;
        var initText = this.content.slice(0,offSet);
        var EndText = this.content.slice(offSet);

        this.content = initText + content + EndText ;
        var index =  this.content.indexOf("\u200B");
        if(index > -1 && index < this.content.length && condition)
        {
            var I = this.content.slice(0,index);
            var E = this.content.slice(index + 1);
            this.content = I + E;
        }
        this._size = this.content.length ; 
        this.End_abs = this.From_abs + this._size - 1 ; 
    }

    sliceContent(pos)
    {
        var offSet = pos - this.From_abs;
        var initText = this.content.slice(0,offSet - 1);
        var EndText = this.content.slice(offSet);
        
        this.content = initText + EndText ;
        this._size = this.content.length ; 
        this.End_abs = this.From_abs + this._size - 1 ; 
    }



}






const FindSize = (arr) => {
    let total = 0;
    const stack = [...arr];

    while (stack.length) {
        const node = stack.pop();  

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



const Find_Node_Deep = (arr , pos) =>  
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

var TN = new TextNode("D_PH0",0,"Type Something",0)
var Ph = new BlockNode("D","PH",0,[TN],0)
var Doc = new DocNode([Ph],0,"D")

export {DocNode , InlineNode , BlockNode , TextNode , Doc} ; 

