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
        return {size :Size , End_abs : (Size) ? (Size - 1) : 0 } ; 
    }


    forEach(f)  
    {
        this.Childs.forEach(f) ; 
    }

    FindNodeAtPos(pos)  
    {
        return Find_Node(this.Childs,pos)
    }

    FindNodeAtPos_Deep(pos)
    {
        if(this.Childs.length === 0) return this ; 
        return Find_Node_Deep(this.Childs,pos)
    }
    
    TextBetween(from , to )
    {
        if(to === -1){to = this.EvalProps().End_abs}
        var nodes = this.NodeBetween_Included(from , to); 
        if(!nodes) return ""
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

    NodeBetween_Included(from , to )
    {
        let finalArr = [] ; 
        if(this.Childs.length === 0) return [] 
        if(to > this.EvalProps().End_abs){to = this.EvalProps().End_abs}
        for(let i = 0 , pos = this.Childs[0].EvalProps().From_abs ; pos <= to ; i++)
        {
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


    Get_Level(lvl)
    {
        var finalArr = [] 
        if(this.level === lvl)
        {
            finalArr.push(this)
        }

        if(lvl > this.level)
        {
            this.forEach((node) =>{finalArr =  finalArr.concat(node.Get_Level(lvl))})
        }
        return finalArr
    }

    Get_Node(level , pos = 0)
    {
        var finalArr = this.Get_Level(level);
        let i = 0 , j = finalArr.length - 1 ; 
        while(i <= j)
        {
            var el1 = finalArr[i] ;
            var el2 = finalArr[j] ; 
            if(pos >= el1.EvalProps().From_abs && pos<= el1.EvalProps().End_abs)
            {
                return el1 ; 
            }

            if(pos >= el2.EvalProps().From_abs && pos<= el2.EvalProps().End_abs)
            {
                return el2 ; 
            }
            i++ ; j-- 
        }
        return null ; 
    }

    Count_levels()
    {
        var lvls = - 1 ; 
        for(let i = - 1 ; ; i++)
        {
            var finalArr = this.Get_Level(i);
            if(finalArr.length)
            {
                lvls = i  
            } 
            else 
            {
                break 
            }
        }

        return lvls
    }


    Search_By_Id(_id)
    {
        this.resetPos() ; 
        if(_id === this._id)
        {
            return this ; 
        }
        var b = [] ;  _id.split("_").forEach((value,index) => {if(index){b.push({value : value.slice(2) , tag : value.slice(0,2)})}})
        if(!b.length ) return null ; 
        if( !this.Childs[b[0].value]) return null ; 
        return this.Childs[b[0].value].Find(0,b)
    }

    Extract_Roots(pos)
    {
        const node = this.FindNodeAtPos_Deep(pos);
        if(!node) return 87
        const nodeId = node._id.split("_");
        const parentArr = [] ; 
        for(let i = 0 ; i < nodeId.length ; i++)
        {
            if(i)
            {
                var newStr = parentArr[i - 1].parentId + "_" + nodeId[i] ;
                parentArr.push({parentLevel : parentArr[i - 1].parentLevel + 1 , parentId : newStr})
                continue ; 
            }
            parentArr.push({parentLevel : -1 , parentId : nodeId[i]}) ; 
        }
        return parentArr ; 
    }

    Insert_BLOCK_IDX_NEW(index = this.Childs.length ,type , arr = [] )
    {
        if(index === -1){index = this.Childs.length}
        var node = new BlockNode(this._id , type , index , arr , 0)
        this.Childs.splice(index , 0 , node);
        this.resetPos() ; // no need for the copying 
    }

    Insert_BLOCK_IDX_EXS(index = this.Childs.length , node)
    {
        if(index === -1){index = this.Childs.length}
        var node = new BlockNode(this._id , node.typ , index , node.Childs , 0 )
        this.Childs.splice(index , 0 , node);
        this.resetPos() ;
    } // needs deep copying if its already included 

    Insert_INLINE_IDX_NEW(_id , type , arr = [] , index = -1)
    {
        this.Search_By_Id(_id).I_I_I_N(index , type , arr)
        this.resetPos()
    }


    Insert_TEXT_IDX_NEW(_id , content , index = -1)
    {
        this.Search_By_Id(_id).I_T_I_N(index , content)
        this.resetPos()
    }


    Cut_Layer_At_Pos(pos , level)
    {
        if(level < 1 ) throw new Error("You cannot cut the levels below 1 ") 

        var Roots = this.Extract_Roots(pos) ;
        if(Roots === 87)
        {
            var RootPrev = this.Extract_Roots(pos - 1) ; 
            if(RootPrev !== 87 && level <= RootPrev.length - 2)
            {
                var FI = undefined ; RootPrev.forEach((value,index) => {if(value.parentLevel === level){FI = index}})
                return { insertedAt : -1 , insertedInto : this.Search_By_Id(RootPrev[FI - 1].parentId)} 
            }
            else
            {
                throw new Error("There is no way you can insert this node , cut layer ")
            }
        }
        if (level > Roots.length - 2) {return {insertedAt : 0 , insertedInto : this.Search_By_Id(Roots[Roots.length - 1].parentId)} };
        var FoundIndex = undefined ; Roots.forEach((value,index) => {if(value.parentLevel === level){FoundIndex = index}})
        var itrCount = (Roots.length - FoundIndex); 
        var v1 ; var v2 ;
        if(this.Search_By_Id(Roots[FoundIndex].parentId).EvalProps().From_abs === pos)
        {
            return {insertedAt : 0 , insertedInto : this.Search_By_Id(Roots[FoundIndex - 1].parentId)}
        }
        for(let i = Roots.length - 1 , j = 0 ; j < itrCount ; j++ , i--)
        {
            
            var CutElm = this.Search_By_Id(Roots[i].parentId);
            var EditElm = this.Search_By_Id(Roots[i - 1].parentId) ;

            var {insertedAt , insertedInto} =EditElm.InsertCut(CutElm.Cut_Pos(pos));
            if(j === itrCount - 1)
            {
                v1 = insertedInto  ; v2 = insertedAt
            }
        }
        this.resetPos() ;
        return {insertedAt : v2 , insertedInto : v1}
    }

    InsertCut(object)
    {
        this.Childs.splice(object.index , 0 ,object.Node);
        return {insertedAt : object.index , insertedInto : this}
    }

    printTree()
    {
        this.forEach((node) => 
        {
            let {size , From_abs , End_abs} = node.EvalProps() ; 
            console.log("The Block Node with id : ",node._id,`:::::::::: size : ${size} , start Pos : ${From_abs} , end Pos : ${End_abs}`)
            node.printTree(1)
        })
    }


    Insert_INLINE_POS_NEW(type , arr = [] , pos , level )
    {
       var {insertedAt , insertedInto} = this.Cut_Layer_At_Pos(pos,level);
       if(insertedAt === 87){ console.log("we cannot proceed further") ; return }
        insertedInto.I_I_I_N(insertedAt , type ,arr)
        this.resetPos()
    }

    Insert_TEXT_POS_NEW( content , pos , level )
    {
       var {insertedAt , insertedInto} = this.Cut_Layer_At_Pos(pos,level);
        if(insertedAt === 87){ console.log("we cannot proceed further") ; return }
        insertedInto.I_T_I_N(insertedAt  ,content)
        this.resetPos()
    }


    INSERT_DIRECT_INLINE_NEW(type , arr = [] , pos , level , idx = -1 )
    {
        var Roots = this.Extract_Roots(pos - 1);
        var FoundIndex ; Roots.forEach((val , index) => {if(val.parentLevel === level){FoundIndex = index}})
        this.Search_By_Id(Roots[FoundIndex - 1].parentId).I_I_I_N(idx, type , arr);
        this.resetPos ; 
    }

    INSERT_DIRECT_TEXT_NEW(content , pos , level , idx = - 1)
    {
        var Roots = this.Extract_Roots(pos - 1);
        var FoundIndex ; Roots.forEach((val , index) => {if(val.parentLevel === level){FoundIndex = index}})
        this.Search_By_Id(Roots[FoundIndex - 1].parentId).I_T_I_N(idx, content);
        this.resetPos
    }

    append(type , arr)
    {
        var EndPos = this.EvalProps().End_abs + 1 ; 
        this.Childs.push(new BlockNode(this._id,type,this.Childs,arr,EndPos))
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

    FindNodeAtPos(pos)  
    {
        return Find_Node(this.Childs,pos)
    }

    TextBetween(from , to )
    {
        console.log("calling for the block node" , this._id)
        var nodes = this.NodeBetween_Included(from , to);
        if(!nodes) return ""
        console.log(nodes)
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

    Get_Level(lvl)
    {
        var finalArr = [] 
        if(this.level === lvl)
        {
            finalArr.push(this)
        }

        if(lvl > this.level)
        {
            this.forEach((node) =>{finalArr =  finalArr.concat(node.Get_Level(lvl))})
        }
        this.resetPos() ; 
        return finalArr
    }


    Get_Node(level , pos)
    {
        var finalArr = this.Get_Level(level);
        let i = 0 , j = finalArr.length - 1 ; 
        while(i <= j)
        {
            var el1 = finalArr[i] ;
            var el2 = finalArr[j] ; 
            if(pos >= el1.EvalProps().From_abs && pos<= el1.EvalProps().End_abs)
            {
                return el1 ; 
            }

            if(pos >= el2.EvalProps().From_abs && pos<= el2.EvalProps().End_abs)
            {
                return el2 ; 
            }
            i++ ; j-- 
        }
        return null ; 
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


    Insert_INLINE_IDX_NEW(index = this.Childs.length ,type , arr = [] )
    {
        if(index === -1){index = this.Childs.length}
        var node = new InlineNode(this._id , type , index , arr , 0)
        this.Childs.splice(index , 0 , node);
        this.resetPos() ; 
    }

    /**@internal */
    I_I_I_N(index = this.Childs.length ,type , arr = [] )
    {
        if(index === -1){index = this.Childs.length}
        var node = new InlineNode(this._id , type , index , arr , 0)
        this.Childs.splice(index , 0 , node);
    }

    Insert_INLINE_IDX_EXS(index = this.Childs.length , node)
    {
        if(index === -1){index = this.Childs.length}
        var node = new InlineNode(this._id , node.typ , index , node.Childs , 0 )
        this.Childs.splice(index , 0 , node);
        this.resetPos() ;
    }

    Insert_TEXT_IDX_NEW(index = this.Childs.length ,content )
    {
        if(index === -1){index = this.Childs.length}
        var node = new TextNode(this._id , index , content , 0 )
        this.Childs.splice(index , 0 , node);
        this.resetPos() ; 
    }

    /**@internal */
    I_T_I_N(index = this.Childs.length ,content )
    {
        if(index === -1){index = this.Childs.length}
        var node = new TextNode(this._id , index , content , 0 )
        this.Childs.splice(index , 0 , node);
        this.resetPos() ; 
    }

    Insert_TEXT_IDX_EXS(index = this.Childs.length , node)
    {
        if(index === -1){index = this.Childs.length}
        var node = new InlineNode(this._id ,index , node.content ,  0 )
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
}











class InlineNode // can contain textNode and inlineNode 
{
    constructor(
        parentId ,
        type  , // SP for span , EM , UL , ST , // LN for link  we will think about the link later 
        count ,
        childArr ,
        From_abs = 0  , 
        attrs = [] ,
        marks // will be an object from the Marks class  
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
        this.attrs = attrs ; 
        this.marks = marks ;  
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

    FindNodeAtPos(pos)  
    {
        return Find_Node(this.Childs,pos)
    }

    TextBetween(from , to )
    {
        var nodes = this.NodeBetween_Included(from , to); 
        if(!nodes) return ""
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
        })
    }


    NodeBetween_Included(from , to )
    {
        let finalArr = [] ; 
        if(this.Childs.length === 0) return [] 
        if(to > this.EvalProps().End_abs || to === -1){to = this.EvalProps().End_abs}
        for(let i = 0 , pos = this.Childs[0].EvalProps().From_abs ; pos <= to ; i++)
        {
            let child = this.Childs[i] ; let end = pos + child.EvalProps().size ; 
            if(end > from)
            {
                finalArr.push(child);
            }
            pos = end ; 
        }

        return finalArr ; 
    }


    Get_Level(lvl)
    {
        var finalArr = [] 
        if(this.level === lvl)
        {
            finalArr.push(this)
        }

        if(lvl > this.level)
        {
            this.forEach((node) =>{finalArr =  finalArr.concat(node.Get_Level(lvl))})
        }
        return finalArr
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


    Insert_INLINE_IDX_NEW(index = this.Childs.length ,type ,arr = [])
    {
        if(index === -1){index = this.Childs.length}
        var node = new InlineNode(this._id , type , index ,  arr , 0)
        this.Childs.splice(index , 0 , node);
        this.resetPos() ; 
    }

    /**@internal */
    I_I_I_N(index = this.Childs.length ,type ,arr = [])
    {
        if(index === -1){index = this.Childs.length}
        var node = new InlineNode(this._id , type , index ,  arr , 0)
        this.Childs.splice(index , 0 , node);
    }

    Insert_INLINE_IDX_EXS(index = this.Childs.length , node)
    {
        if(index === -1){index = this.Childs.length}
        var node = new InlineNode(this._id , node.typ , index , node.Childs , 0 )
        this.Childs.splice(index , 0 , node);
        this.resetPos() ;
    }

    Insert_TEXT_IDX_NEW(index = this.Childs.length ,content )
    {
        if(index === -1){index = this.Childs.length}
        var node = new TextNode(this._id , index , content , 0 )
        this.Childs.splice(index , 0 , node);
        this.resetPos() ; 
    }

    /**@internal */ // insert Text Indexed New
    I_T_I_N(index = this.Childs.length ,content )
    {
        if(index === -1){index = this.Childs.length}
        var node = new TextNode(this._id , index , content , 0 )
        this.Childs.splice(index , 0 , node);
    }

    Insert_TEXT_IDX_EXS(index = this.Childs.length , node)
    {
        if(index === -1){index = this.Childs.length}
        var node = new InlineNode(this._id ,index , node.content ,  0 )
        this.Childs.splice(index , 0 , node);
        this.resetPos() ;
    }

    InsertCut(object)
    {
        this.Childs.splice(object.index  , 0 ,object.Node);
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
            var {size , From_abs , End_abs} = node.EvalProps() ; 
            console.log(string , `The ${node.typ} Node with Id ${node._id} ::: {size : ${size} , StartPos : ${From_abs} , EndPos : ${End_abs}} `)
            node.printTree(val + 1)
        })
    }

    
}









class TextNode // cannot contain anything  , all the content is basically the textNode what you see 
{
    constructor(
        parentId  , 
        count , 
        content =" ", 
        From_abs = 0  ,  
    )

    {
        this.parent = parentId ; 
        this.count = count ; 
        this.typ = "TX"
        this._id = this.parent + "_" + this.typ + this.count ; 
        this.content = content ; // will be string 
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

    Extend(string,bridge="")
    {
        this.content += (bridge + string) ; 
        this._size = this.content.length ; 
        this.End_abs = this.From_abs + this._size - 1 ; 
    }

    Extend_TextNode(obj,bridge="")
    {
        this.content += (bridge + obj.content) ;
        this._size = this.content.length ; 
        this.End_abs = this.From_abs + this._size - 1 ; 
    }

    resetPos ()
    {
        this._id = this.parent + "_" + this.typ + this.count ; 
        this.End_abs = (this._size) ? (this.From_abs + this._size - 1) : this.From_abs ; 
    }

    Get_Level(lvl)
    {
        var finalArr = [] 
        if(this.level === lvl)
        {
            finalArr.push(this)
        }

        return finalArr
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

    Cut_Pos(pos)
    {
        var offset = pos - this.From_abs ;
        var RetainedContent = (offset) ? this.content.slice(0,offset) : "";
        var CuttedContent = this.content.slice(offset);
        this.content = RetainedContent;
        this._size = this.content.length ;
        this.End_abs = (this._size) ? (this.From_abs + this._size - 1) : this.From_abs ; 

        return {Node : new TextNode(this.parent ,this.count + 1 ,CuttedContent,this.End_abs + 1) , index : this.count + 1}
    }

    printTree(){/* reached the end */}
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




const Find_Node = (arr , pos) => // for text Node 
{
    for(let i = 0 ; i < arr.length ; i++)
    {
        var elem = arr[i] ; 
        if(elem.EvalProps().End_abs >= pos )
        {
            if(elem._type === 0)
            {
                return elem ; 
            }
            return Find_Node(elem.Childs , pos) ;  
        }
    }
}

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